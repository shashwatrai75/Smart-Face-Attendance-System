const Student = require('../models/Student');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const AuditLog = require('../models/AuditLog');
const { encryptEmbedding, decryptEmbedding } = require('../utils/crypto');
const ExcelJS = require('exceljs');
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
    } else if (req.user.role === 'lecturer') {
      // If lecturer, only show students from their classes
      const lecturerClasses = await Class.find({ lecturerId: req.user._id }).select('_id');
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

    // Verify lecturer has access to this class
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (req.user.role === 'lecturer' && classDoc.lecturerId.toString() !== req.user._id.toString()) {
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

const bulkImportStudents = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { classId } = req.body;
    if (!classId) {
      return res.status(400).json({ error: 'Class ID is required' });
    }

    // Verify class exists
    const classExists = await Class.findById(classId);
    if (!classExists) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      return res.status(400).json({ error: 'Invalid Excel file format' });
    }

    const students = [];
    const errors = [];
    let rowIndex = 2; // Start from row 2 (skip header)

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const fullName = row.getCell(1).value?.toString().trim();
      const rollNo = row.getCell(2).value?.toString().trim();

      if (!fullName || !rollNo) {
        errors.push(`Row ${rowNumber}: Missing fullName or rollNo`);
        return;
      }

      students.push({ fullName, rollNo, rowNumber });
    });

    if (students.length === 0) {
      return res.status(400).json({ error: 'No valid students found in file' });
    }

    // Check for duplicates in file
    const rollNos = students.map(s => s.rollNo);
    const duplicates = rollNos.filter((r, i) => rollNos.indexOf(r) !== i);
    if (duplicates.length > 0) {
      return res.status(400).json({ 
        error: `Duplicate roll numbers in file: ${duplicates.join(', ')}` 
      });
    }

    // Check for existing students
    const existingStudents = await Student.find({ 
      classId, 
      rollNo: { $in: rollNos } 
    });
    const existingRollNos = existingStudents.map(s => s.rollNo);
    
    if (existingRollNos.length > 0) {
      return res.status(400).json({ 
        error: `Roll numbers already exist in this class: ${existingRollNos.join(', ')}` 
      });
    }

    // Return students list for face capture (frontend will handle face enrollment)
    res.json({
      success: true,
      students,
      message: `${students.length} students ready for enrollment. Please capture face data for each student.`,
    });
  } catch (error) {
    logger.error(`Bulk import error: ${error.message}`);
    next(error);
  }
};

const getStudentAttendanceHistory = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate, classId } = req.query;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check access permissions
    if (req.user.role === 'lecturer') {
      const classDoc = await Class.findById(student.classId);
      if (!classDoc || classDoc.lecturerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    let query = { studentId };
    if (classId) query.classId = classId;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    const attendance = await Attendance.find(query)
      .populate('classId', 'className subject')
      .populate('lecturerId', 'name email')
      .sort({ date: -1, time: -1 });

    // Calculate statistics
    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    const late = attendance.filter(a => a.status === 'late').length;
    const excused = attendance.filter(a => a.status === 'excused').length;
    const attendanceRate = total > 0 ? ((present + late) / total * 100).toFixed(2) : 0;

    res.json({
      success: true,
      student: {
        id: student._id,
        fullName: student.fullName,
        rollNo: student.rollNo,
      },
      attendance,
      statistics: {
        total,
        present,
        absent,
        late,
        excused,
        attendanceRate: parseFloat(attendanceRate),
      },
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
  bulkImportStudents,
  getStudentAttendanceHistory,
};

