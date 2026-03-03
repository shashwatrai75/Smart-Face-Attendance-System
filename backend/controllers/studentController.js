const Student = require('../models/Student');
const Section = require('../models/Section');
const ClassSession = require('../models/ClassSession');
const Attendance = require('../models/Attendance');
const AuditLog = require('../models/AuditLog');
const ExcelJS = require('exceljs');
const logger = require('../utils/logger');

const enrollStudent = async (req, res, next) => {
  try {
    const {
      fullName,
      rollNo,
      guardianName,
      guardianPhone,
      dateOfBirth,
      gender,
      sectionId,
    } = req.body;

    if (
      !fullName ||
      !rollNo ||
      !guardianName ||
      !guardianPhone ||
      !dateOfBirth ||
      !gender ||
      !sectionId
    ) {
      return res.status(400).json({
        error:
          'Missing required fields: fullName, rollNo, guardianName, guardianPhone, dateOfBirth, gender, sectionId',
      });
    }

    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }
    if (section.sectionType !== 'class') {
      return res
        .status(400)
        .json({ error: 'Students can only be enrolled in class-type sections' });
    }

    const existingStudent = await Student.findOne({ rollNo, sectionId });
    if (existingStudent) {
      return res
        .status(400)
        .json({ error: 'Roll number already exists in this section' });
    }

    const student = await Student.create({
      fullName,
      rollNo,
      guardianName,
      guardianPhone,
      dateOfBirth,
      gender,
      sectionId,
    });

    await AuditLog.create({
      actorUserId: req.user._id,
      action: 'ENROLL_STUDENT',
      metadata: { studentId: student._id, sectionId, rollNo },
    });

    res.status(201).json({
      success: true,
      student: {
        id: student._id,
        fullName: student.fullName,
        rollNo: student.rollNo,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        sectionId: student.sectionId,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ error: 'Roll number already exists in this section' });
    }
    next(error);
  }
};

const getStudents = async (req, res, next) => {
  try {
    const { sectionId } = req.query;

    let query = {};

    if (sectionId) {
      query.sectionId = sectionId;
    } else if (req.user.role === 'lecturer' && req.user.sectionId) {
      query.sectionId = req.user.sectionId;
    }

    const students = await Student.find(query)
      .populate('sectionId', 'sectionName sectionType')
      .sort({ rollNo: 1 });

    res.json({
      success: true,
      students,
    });
  } catch (error) {
    next(error);
  }
};

// Legacy embedding-based endpoint removed – face photos are now used instead.

const deleteStudentData = async (req, res, next) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    await Attendance.deleteMany({ studentId: id });
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

    const { sectionId } = req.body;
    if (!sectionId) {
      return res.status(400).json({ error: 'Section ID is required' });
    }

    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }
    if (section.sectionType !== 'class') {
      return res.status(400).json({ error: 'Students can only be imported into class-type sections' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      return res.status(400).json({ error: 'Invalid Excel file format' });
    }

    const students = [];
    const errors = [];
    let rowIndex = 2;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

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

    const rollNos = students.map((s) => s.rollNo);
    const duplicates = rollNos.filter((r, i) => rollNos.indexOf(r) !== i);
    if (duplicates.length > 0) {
      return res.status(400).json({
        error: `Duplicate roll numbers in file: ${duplicates.join(', ')}`,
      });
    }

    const existingStudents = await Student.find({ sectionId, rollNo: { $in: rollNos } });
    const existingRollNos = existingStudents.map((s) => s.rollNo);

    if (existingRollNos.length > 0) {
      return res.status(400).json({
        error: `Roll numbers already exist in this section: ${existingRollNos.join(', ')}`,
      });
    }

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
    const { startDate, endDate, sectionId } = req.query;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (req.user.role === 'lecturer') {
      const teachesSession = await ClassSession.findOne({ sectionId: student.sectionId, teacherId: req.user._id });
      const userSectionMatch = req.user.sectionId && req.user.sectionId.toString() === student.sectionId.toString();
      if (!teachesSession && !userSectionMatch) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    let query = { studentId };
    if (sectionId) query.sectionId = sectionId;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    const attendance = await Attendance.find(query)
      .populate('sectionId', 'sectionName sectionType')
      .populate('lecturerId', 'name email')
      .sort({ date: -1, time: -1 });

    const total = attendance.length;
    const present = attendance.filter((a) => a.status === 'present').length;
    const absent = attendance.filter((a) => a.status === 'absent').length;
    const late = attendance.filter((a) => a.status === 'late').length;
    const excused = attendance.filter((a) => a.status === 'excused').length;
    const attendanceRate = total > 0 ? (((present + late) / total) * 100).toFixed(2) : 0;

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
  deleteStudentData,
  bulkImportStudents,
  getStudentAttendanceHistory,
};
