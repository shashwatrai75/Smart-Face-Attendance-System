const CheckInRecord = require('../models/CheckInRecord');
const Section = require('../models/Section');
const SectionMember = require('../models/SectionMember');
const DepartmentFaceEnrollment = require('../models/DepartmentFaceEnrollment');
const AuditLog = require('../models/AuditLog');
const { encryptEmbedding, decryptEmbedding } = require('../utils/crypto');
const { timeToMinutes, nowMinutes, todayDate } = require('../utils/timeHelpers');

const recordCheckIn = async (req, res, next) => {
  try {
    const { sectionId, userId } = req.body;

    if (!sectionId || !userId) {
      return res.status(400).json({ error: 'Section ID and User ID are required' });
    }

    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    if (section.sectionType !== 'department') {
      return res.status(400).json({ error: 'Check-in is only for department sections' });
    }

    const member = await SectionMember.findOne({ sectionId, userId });
    if (!member) {
      return res.status(403).json({ error: 'User is not a member of this section' });
    }

    const today = todayDate();
    const nowMin = nowMinutes();

    if (section.shiftStartTime || section.shiftEndTime) {
      const shiftStartM = section.shiftStartTime ? timeToMinutes(section.shiftStartTime) : 0;
      const shiftEndM = section.shiftEndTime ? timeToMinutes(section.shiftEndTime) : 24 * 60 - 1;
      if (Number.isNaN(shiftStartM) || Number.isNaN(shiftEndM)) {
        return res.status(400).json({ error: 'Invalid shift time configuration' });
      }
      if (section.startDate && today < section.startDate) {
        return res.status(400).json({
          error: `Check-in is only allowed from ${section.startDate}.`,
        });
      }
    }

    let record = await CheckInRecord.findOne({ userId, sectionId, date: today });

    if (!record) {
      if (section.shiftStartTime) {
        const shiftStartM = timeToMinutes(section.shiftStartTime);
        if (nowMin < shiftStartM) {
          return res.status(400).json({
            error: `Check-in is only allowed after shift start time (${section.shiftStartTime}).`,
          });
        }
      }
      const now = new Date();
      record = await CheckInRecord.create({
        userId,
        sectionId,
        date: today,
        checkInTime: now,
      });
      await AuditLog.create({
        actorUserId: req.user._id,
        action: 'CHECK_IN',
        metadata: { sectionId, userId, date: today },
      });
      return res.json({
        success: true,
        action: 'check-in',
        record,
        message: 'Check-in recorded',
      });
    }

    if (record.checkOutTime) {
      return res.status(400).json({ error: 'Already checked out for today' });
    }

    if (section.shiftEndTime) {
      const shiftEndM = timeToMinutes(section.shiftEndTime);
      if (nowMin > shiftEndM) {
        return res.status(400).json({
          error: `Check-out is only allowed before shift end time (${section.shiftEndTime}).`,
        });
      }
    }

    const now = new Date();
    record.checkOutTime = now;
    record.workMinutes = Math.round((record.checkOutTime - record.checkInTime) / (1000 * 60));
    await record.save();

    await AuditLog.create({
      actorUserId: req.user._id,
      action: 'CHECK_OUT',
      metadata: { sectionId, userId, date: today, workMinutes: record.workMinutes },
    });

    res.json({
      success: true,
      action: 'check-out',
      record,
      message: `Check-out recorded. Work hours: ${record.workMinutes} minutes`,
    });
  } catch (error) {
    next(error);
  }
};

const getCheckInHistory = async (req, res, next) => {
  try {
    const user = req.user;
    const { sectionId, dateFrom, dateTo, userId } = req.query;

    let query = {};

    if (sectionId) query.sectionId = sectionId;
    if (userId) query.userId = userId;

    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = dateFrom;
      if (dateTo) query.date.$lte = dateTo;
    }

    if (user.role === 'viewer' || user.role === 'lecturer') {
      query.userId = user._id;
    }

    const records = await CheckInRecord.find(query)
      .populate('userId', 'name email')
      .populate('sectionId', 'sectionName sectionType')
      .sort({ date: -1, checkInTime: -1 })
      .limit(500);

    res.json({
      success: true,
      records,
      count: records.length,
    });
  } catch (error) {
    next(error);
  }
};

const enrollDepartmentMember = async (req, res, next) => {
  try {
    const { userId, sectionId, embeddingFloatArray, embeddingVersion } = req.body;

    if (!userId || !sectionId || !embeddingFloatArray) {
      return res.status(400).json({ error: 'User ID, section ID and embedding are required' });
    }

    if (!Array.isArray(embeddingFloatArray) || embeddingFloatArray.length !== 128) {
      return res.status(400).json({ error: 'Embedding must be an array of 128 floats' });
    }

    const section = await Section.findById(sectionId);
    if (!section) return res.status(404).json({ error: 'Section not found' });
    if (section.sectionType !== 'department') {
      return res.status(400).json({ error: 'Section must be a department type' });
    }

    const member = await SectionMember.findOne({ sectionId, userId });
    if (!member) {
      return res.status(400).json({ error: 'User must be added to section before face enrollment' });
    }

    const encryptedEmbedding = encryptEmbedding(embeddingFloatArray);

    const existing = await DepartmentFaceEnrollment.findOne({ userId, sectionId });
    if (existing) {
      existing.faceEmbeddingEnc = encryptedEmbedding;
      existing.embeddingVersion = embeddingVersion || 1;
      await existing.save();
    } else {
      await DepartmentFaceEnrollment.create({
        userId,
        sectionId,
        faceEmbeddingEnc: encryptedEmbedding,
        embeddingVersion: embeddingVersion || 1,
      });
    }

    res.json({ success: true, message: 'Face enrolled successfully' });
  } catch (error) {
    next(error);
  }
};

const getDepartmentMemberEmbeddings = async (req, res, next) => {
  try {
    const { sectionId } = req.params;

    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    if (section.sectionType !== 'department') {
      return res.status(400).json({ error: 'Section must be a department type' });
    }

    const enrollments = await DepartmentFaceEnrollment.find({ sectionId })
      .populate('userId', 'name email');

    const students = enrollments
      .map((e) => {
        try {
          const embedding = decryptEmbedding(e.faceEmbeddingEnc);
          return {
            id: e.userId._id.toString(),
            fullName: e.userId.name,
            rollNo: e.userId.email,
            embedding,
            embeddingVersion: e.embeddingVersion,
          };
        } catch (err) {
          return null;
        }
      })
      .filter(Boolean);

    res.json({
      success: true,
      students,
      note: 'Embeddings only - no face photos stored or transmitted',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  recordCheckIn,
  getCheckInHistory,
  getDepartmentMemberEmbeddings,
  enrollDepartmentMember,
};
