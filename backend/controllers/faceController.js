const fs = require('fs');
const path = require('path');
const Student = require('../models/Student');
const User = require('../models/User');
const Section = require('../models/Section');
const SectionMember = require('../models/SectionMember');
const SystemSettings = require('../models/SystemSettings');
const {
  generateEmbedding,
  compareEmbeddings,
  getSimilarityThreshold,
} = require('../services/faceRecognition');

const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads');
const FACES_DIR = path.join(UPLOADS_ROOT, 'faces');
const TEMP_DIR = path.join(UPLOADS_ROOT, 'temp');

// Ensure base directories exist
if (!fs.existsSync(FACES_DIR)) {
  fs.mkdirSync(FACES_DIR, { recursive: true });
}
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function parseBase64Image(dataString) {
  if (!dataString || typeof dataString !== 'string') {
    throw new Error('Invalid image data');
  }

  const matches = dataString.match(/^data:(image\/\w+);base64,(.+)$/);
  const isDataUrl = !!matches;

  const mimeType = isDataUrl ? matches[1] : 'image/jpeg';
  const base64Data = isDataUrl ? matches[2] : dataString;

  const buffer = Buffer.from(base64Data, 'base64');
  const ext = mimeType === 'image/png' ? '.png' : '.jpg';

  return { buffer, ext };
}

async function getMaxFaceImages() {
  try {
    const doc = await SystemSettings.findOne({ key: 'maxFaceImages' });
    if (doc && typeof doc.value === 'number' && doc.value > 0) {
      return doc.value;
    }
  } catch (err) {
    // Ignore and fall back
  }
  return 5; // sensible default
}

/**
 * POST /api/face/enroll
 *
 * Body:
 * - targetType: "student" | "user"
 * - targetId: Mongo ID of Student/User
 * - imageBase64: data URL or raw base64 string
 */
const enrollFace = async (req, res, next) => {
  try {
    const { targetType, targetId, imageBase64 } = req.body;

    if (!targetType || !['student', 'user'].includes(targetType)) {
      return res.status(400).json({ error: 'targetType must be student or user' });
    }
    if (!targetId) {
      return res.status(400).json({ error: 'targetId is required' });
    }
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const { buffer, ext } = parseBase64Image(imageBase64);

    // In a full implementation, we would validate that exactly one face is present.
    // For now, we rely on frontend liveness checks and consistent capture UI.

    const filename = `face-${targetType}-${targetId}-${Date.now()}${ext}`;
    const filePath = path.join(FACES_DIR, filename);
    await fs.promises.writeFile(filePath, buffer);

    const imageUrl = `/uploads/faces/${filename}`;
    const maxFaceImages = await getMaxFaceImages();

    let entity;
    if (targetType === 'student') {
      entity = await Student.findById(targetId);
    } else {
      entity = await User.findById(targetId);
    }

    if (!entity) {
      // Cleanup file if entity not found
      await fs.promises.unlink(filePath).catch(() => {});
      return res.status(404).json({ error: `${targetType} not found` });
    }

    if (!Array.isArray(entity.faceImages)) {
      entity.faceImages = [];
    }

    if (entity.faceImages.length >= maxFaceImages) {
      return res.status(400).json({
        error: `Maximum of ${maxFaceImages} face images reached. Delete old images before adding new ones.`,
      });
    }

    entity.faceImages.push(imageUrl);
    if (!entity.defaultFaceImage) {
      entity.defaultFaceImage = imageUrl;
    }
    if (!entity.faceCreatedAt) {
      entity.faceCreatedAt = new Date();
    }

    await entity.save();

    return res.status(201).json({
      success: true,
      imageUrl,
      user: entity,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/face/verify
 *
 * Body:
 * - imageBase64: data URL or base64 string
 * - sectionId: section in which to search
 *
 * Returns:
 * {
 *   matched: boolean,
 *   similarity: number | null,
 *   user: {...} | null
 * }
 */
const verifyFace = async (req, res, next) => {
  try {
    const { imageBase64, sectionId } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }
    if (!sectionId) {
      return res.status(400).json({ error: 'sectionId is required' });
    }

    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const { buffer, ext } = parseBase64Image(imageBase64);
    const tempFilename = `live-${sectionId}-${Date.now()}${ext}`;
    const tempPath = path.join(TEMP_DIR, tempFilename);
    await fs.promises.writeFile(tempPath, buffer);

    let liveEmbedding;
    try {
      liveEmbedding = await generateEmbedding(tempPath);
    } catch (err) {
      await fs.promises.unlink(tempPath).catch(() => {});
      return res.status(400).json({ error: 'Failed to process face image' });
    } finally {
      // Best-effort cleanup; if unlink fails it's not critical
      fs.promises.unlink(tempPath).catch(() => {});
    }

    const threshold = await getSimilarityThreshold();
    let bestMatch = null;
    let bestSimilarity = -1;

    if (section.sectionType === 'class') {
      // Class attendance – match against students in this section
      const students = await Student.find({
        sectionId,
        faceImages: { $exists: true, $ne: [] },
      });

      for (const student of students) {
        for (const imageUrl of student.faceImages || []) {
          const imgPath = path.join(UPLOADS_ROOT, imageUrl.replace(/^\/?uploads[\\/]/, '').replace(/\//g, path.sep));
          try {
            const emb = await generateEmbedding(imgPath);
            const sim = await compareEmbeddings(liveEmbedding, emb);
            if (sim > bestSimilarity) {
              bestSimilarity = sim;
              bestMatch = {
                type: 'student',
                id: student._id,
                fullName: student.fullName,
                rollNo: student.rollNo,
                defaultFaceImage: student.defaultFaceImage || (student.faceImages && student.faceImages[0]) || null,
                sectionType: 'class',
              };
            }
          } catch (err) {
            // Ignore individual image failures
          }
        }
      }
    } else if (section.sectionType === 'department') {
      // Department check-in – match against users in this section
      const members = await SectionMember.find({ sectionId }).populate('userId');

      for (const member of members) {
        const user = member.userId;
        if (!user || !Array.isArray(user.faceImages) || user.faceImages.length === 0) continue;

        for (const imageUrl of user.faceImages) {
          const imgPath = path.join(UPLOADS_ROOT, imageUrl.replace(/^\/?uploads[\\/]/, '').replace(/\//g, path.sep));
          try {
            const emb = await generateEmbedding(imgPath);
            const sim = await compareEmbeddings(liveEmbedding, emb);
            if (sim > bestSimilarity) {
              bestSimilarity = sim;
              bestMatch = {
                type: 'user',
                id: user._id,
                name: user.name,
                email: user.email,
                defaultFaceImage: user.defaultFaceImage || (user.faceImages && user.faceImages[0]) || null,
                sectionType: 'department',
              };
            }
          } catch (err) {
            // Ignore image failures
          }
        }
      }
    } else {
      return res.status(400).json({ error: `Unsupported section type: ${section.sectionType}` });
    }

    const matched = bestMatch && bestSimilarity >= threshold;

    return res.json({
      matched: !!matched,
      similarity: bestSimilarity >= 0 ? bestSimilarity : null,
      user: matched ? bestMatch : null,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  enrollFace,
  verifyFace,
};

