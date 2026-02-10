const Student = require('../models/Student');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const AuditLog = require('../models/AuditLog');
const { encryptEmbedding, decryptEmbedding } = require('../utils/crypto');
const logger = require('../utils/logger');

const enrollStudent = async (req, res, next) => {
  try {
    const { fullName, rollNo, classId, embeddingFloatArray, embeddingVersion } = req.body;

    if (!fullName || !rollNo || !classId || !embeddingFloatArray) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!Array.isArray(embeddingFloatArray) || embeddingFloatArray.length !== 128) {
      return res.status(400).json({ error: 'Embedding must be an array of 128 floats' });
    }

    // Verify class exists
    const classExists = await Class.findById(classId);
    if (!classExists) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Check if rollNo already exists in this class
    const existingStudent = await Student.findOne({ rollNo, classId });
    if (existingStudent) {
      return res.status(400).json({ error: 'Roll number already exists in this class' });
    }

    // Encrypt embedding
    const encryptedEmbedding = encryptEmbedding(embeddingFloatArray);

    const student = await Student.create({
      fullName,
      rollNo,
      classId,
      faceEmbeddingEnc: encryptedEmbedding,
      embeddingVersion: embeddingVersion || 1,
    });

    await AuditLog.create({
      actorUserId: req.user._id,
      action: 'ENROLL_STUDENT',
      metadata: { studentId: student._id, classId, rollNo },
    });

    res.status(201).json({
      success: true,
      student: {
        id: student._id,
        fullName: student.fullName,
        rollNo: student.rollNo,
        classId: student.classId,
        embeddingVersion: student.embeddingVersion,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Roll number already exists in this class' });
    }
    next(error);
  }
};

const getStudents = async (req, res, next) => {
  try {
    const { classId } = req.query;

    let query = {};

    if (classId) {
      query.classId = classId;
    } else if (req.user.role === 'teacher') {
      // If teacher, only show students from their classes
      const teacherClasses = await Class.find({ teacherId: req.user._id }).select('_id');
      const classIds = teacherClasses.map((c) => c._id);
      query.classId = { $in: classIds };
    }

    const students = await Student.find(query)
      .populate('classId', 'className subject')
      .select('-faceEmbeddingEnc')
      .sort({ rollNo: 1 });

    res.json({
      success: true,
      students,
    });
  } catch (error) {
    next(error);
  }
};

const getStudentEmbeddings = async (req, res, next) => {
  try {
    const { classId } = req.params;

    // Verify teacher has access to this class
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (req.user.role === 'teacher' && classDoc.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied to this class' });
    }

    const students = await Student.find({ classId }).select('_id fullName rollNo faceEmbeddingEnc embeddingVersion');

    // Decrypt embeddings for comparison (only for authorized teacher)
    const studentsWithEmbeddings = students.map((student) => {
      try {
        const decryptedEmbedding = decryptEmbedding(student.faceEmbeddingEnc);
        return {
          id: student._id,
          fullName: student.fullName,
          rollNo: student.rollNo,
          embedding: decryptedEmbedding,
          embeddingVersion: student.embeddingVersion,
        };
      } catch (error) {
        logger.error(`Error decrypting embedding for student ${student._id}: ${error.message}`);
        return null;
      }
    }).filter(Boolean);

    res.json({
      success: true,
      students: studentsWithEmbeddings,
      note: 'Embeddings only - no face photos stored or transmitted',
    });
  } catch (error) {
    next(error);
  }
};

const deleteStudentData = async (req, res, next) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Delete all attendance records for this student
    await Attendance.deleteMany({ studentId: id });

    // Delete student (this will also delete the encrypted embedding)
    await Student.findByIdAndDelete(id);

    await AuditLog.create({
      actorUserId: req.user._id,
      action: 'DELETE_DATA',
      metadata: { studentId: id, rollNo: student.rollNo },
    });

    res.json({
      success: true,
      message: 'Student data and all associated attendance records deleted permanently',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  enrollStudent,
  getStudents,
  getStudentEmbeddings,
  deleteStudentData,
};

