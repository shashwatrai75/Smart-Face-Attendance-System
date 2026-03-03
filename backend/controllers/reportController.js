const Attendance = require('../models/Attendance');
const AttendanceSession = require('../models/AttendanceSession');
const ClassSession = require('../models/ClassSession');
const Section = require('../models/Section');
const Student = require('../models/Student');
const { exportAttendance } = require('../utils/excelExport');
const logger = require('../utils/logger');

const exportReport = async (req, res, next) => {
  try {
    const user = req.user;
    const { sectionId, dateFrom, dateTo, format = 'xlsx' } = req.query;

    if (!sectionId) {
      return res.status(400).json({ error: 'Section ID is required' });
    }

    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    if (user.role === 'lecturer') {
      const taughtSessions = await ClassSession.find({ teacherId: user._id }).select('sectionId');
      const sectionIds = taughtSessions.map((s) => s.sectionId && s.sectionId.toString());
      if (user.sectionId) sectionIds.push(user.sectionId.toString());
      if (!sectionIds.includes(sectionId)) {
        return res.status(403).json({ error: 'Access denied to this section' });
      }
    }

    let query = { sectionId };

    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = dateFrom;
      if (dateTo) query.date.$lte = dateTo;
    }

    const attendance = await Attendance.find(query)
      .populate('studentId', 'fullName rollNo')
      .populate('sectionId', 'sectionName sectionType')
      .populate('lecturerId', 'name')
      .sort({ date: -1, time: -1 });

    if (attendance.length === 0) {
      return res.status(404).json({ error: 'No attendance records found' });
    }

    const exportData = attendance.map((record) => ({
      date: record.date,
      time: record.time,
      studentName: record.studentId?.fullName || '',
      rollNo: record.studentId?.rollNo || '',
      sectionName: record.sectionId?.sectionName || '',
      status: record.status,
      lecturerName: record.lecturerId?.name || '',
    }));

    const buffer = await exportAttendance(exportData, format);

    const filename = `attendance-${sectionId}-${dateFrom || 'all'}-${dateTo || 'all'}.${format === 'csv' ? 'csv' : 'xlsx'}`;
    const contentType = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    logger.error(`Export report error: ${error.message}`);
    next(error);
  }
};

const getSummary = async (req, res, next) => {
  try {
    const user = req.user;
    const { startDate, endDate } = req.query;

    let sectionQuery = {};
    let attendanceQuery = {};
    let sessionQuery = { status: 'completed' };

    if (user.role === 'superadmin' || user.role === 'admin') {
      // no extra filters
    } else if (user.role === 'hr') {
      // HR: reports are class-attendance based; return empty summary (check-in data is in History)
      return res.json({
        success: true,
        summary: { totalSections: 0, totalStudents: 0, averageAttendance: 0, totalSessions: 0 },
      });
    } else if (user.role === 'lecturer') {
      const taughtSessions = await ClassSession.find({ teacherId: user._id }).select('sectionId');
      const sectionIds = taughtSessions.map((s) => s.sectionId);
      if (user.sectionId) sectionIds.push(user.sectionId);
      if (sectionIds.length === 0) {
        return res.json({
          success: true,
          summary: {
            totalSections: 0,
            totalStudents: 0,
            averageAttendance: 0,
            totalSessions: 0,
          },
        });
      }
      sectionQuery._id = { $in: sectionIds };
      attendanceQuery.sectionId = { $in: sectionIds };
      sessionQuery.sectionId = { $in: sectionIds };
      sessionQuery.lecturerId = user._id;
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (startDate || endDate) {
      attendanceQuery.date = attendanceQuery.date || {};
      sessionQuery.date = sessionQuery.date || {};
      if (startDate) {
        attendanceQuery.date.$gte = startDate;
        sessionQuery.date.$gte = startDate;
      }
      if (endDate) {
        attendanceQuery.date.$lte = endDate;
        sessionQuery.date.$lte = endDate;
      }
    }

    const totalSections = await Section.countDocuments(sectionQuery);

    let totalStudents = 0;
    if (user.role === 'lecturer') {
      const taughtSessions = await ClassSession.find({ teacherId: user._id }).select('sectionId');
      const sectionIds = taughtSessions.map((s) => s.sectionId);
      if (user.sectionId) sectionIds.push(user.sectionId);
      totalStudents = await Student.countDocuments({ sectionId: { $in: sectionIds } });
    } else {
      totalStudents = await Student.countDocuments();
    }

    const totalSessions = await AttendanceSession.countDocuments(sessionQuery);

    const attendanceStats = await Attendance.aggregate([
      { $match: attendanceQuery },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          presentCount: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
        },
      },
    ]);

    const stats = attendanceStats[0] || { totalRecords: 0, presentCount: 0 };
    const averageAttendance =
      stats.totalRecords > 0 ? ((stats.presentCount / stats.totalRecords) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      summary: {
        totalSections,
        totalStudents,
        averageAttendance: parseFloat(averageAttendance),
        totalSessions,
      },
    });
  } catch (error) {
    logger.error(`Get summary error: ${error.message}`);
    next(error);
  }
};

const getClassWiseData = async (req, res, next) => {
  try {
    const user = req.user;
    const { startDate, endDate } = req.query;

    let sectionQuery = {};
    let attendanceQuery = {};

    if (user.role === 'superadmin' || user.role === 'admin') {
      sectionQuery = { sectionType: 'class' };
    } else if (user.role === 'hr') {
      return res.json({ success: true, classWiseData: [] });
    } else if (user.role === 'lecturer') {
      const taughtSessions = await ClassSession.find({ teacherId: user._id }).select('sectionId');
      const sectionIds = taughtSessions.map((s) => s.sectionId);
      if (user.sectionId) sectionIds.push(user.sectionId);
      if (sectionIds.length === 0) {
        return res.json({ success: true, classWiseData: [] });
      }
      sectionQuery = { _id: { $in: sectionIds }, sectionType: 'class' };
      attendanceQuery.sectionId = { $in: sectionIds };
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (startDate || endDate) {
      attendanceQuery.date = {};
      if (startDate) attendanceQuery.date.$gte = startDate;
      if (endDate) attendanceQuery.date.$lte = endDate;
    }

    const sections = await Section.find(sectionQuery).select('_id sectionName sectionType');

    const sectionStats = await Attendance.aggregate([
      { $match: attendanceQuery },
      {
        $group: {
          _id: '$sectionId',
          totalRecords: { $sum: 1 },
          presentCount: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absentCount: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          lateCount: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
        },
      },
    ]);

    const statsMap = new Map();
    sectionStats.forEach((stat) => statsMap.set(stat._id?.toString(), stat));

    const classWiseData = sections.map((sec) => {
      const stats = statsMap.get(sec._id.toString()) || {
        totalRecords: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
      };
      const attendancePercentage =
        stats.totalRecords > 0 ? ((stats.presentCount / stats.totalRecords) * 100).toFixed(2) : 0;

      return {
        sectionId: sec._id,
        sectionName: sec.sectionName,
        sectionType: sec.sectionType,
        totalRecords: stats.totalRecords,
        presentCount: stats.presentCount,
        absentCount: stats.absentCount,
        lateCount: stats.lateCount,
        attendancePercentage: parseFloat(attendancePercentage),
      };
    });

    res.json({
      success: true,
      classWiseData,
    });
  } catch (error) {
    logger.error(`Get class-wise data error: ${error.message}`);
    next(error);
  }
};

const getTrendData = async (req, res, next) => {
  try {
    const user = req.user;
    const { startDate, endDate } = req.query;

    let attendanceQuery = {};

    if (user.role === 'superadmin' || user.role === 'admin') {
      // all attendance
    } else if (user.role === 'hr') {
      return res.json({ success: true, trendData: [] });
    } else if (user.role === 'lecturer') {
      const taughtSessions = await ClassSession.find({ teacherId: user._id }).select('sectionId');
      const sectionIds = taughtSessions.map((s) => s.sectionId);
      if (user.sectionId) sectionIds.push(user.sectionId);
      attendanceQuery.sectionId = { $in: sectionIds };
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (startDate || endDate) {
      attendanceQuery.date = {};
      if (startDate) attendanceQuery.date.$gte = startDate;
      if (endDate) attendanceQuery.date.$lte = endDate;
    }

    const trendData = await Attendance.aggregate([
      { $match: attendanceQuery },
      {
        $group: {
          _id: '$date',
          totalRecords: { $sum: 1 },
          presentCount: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absentCount: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const formattedTrend = trendData.map((item) => {
      const attendancePercentage =
        item.totalRecords > 0 ? ((item.presentCount / item.totalRecords) * 100).toFixed(2) : 0;
      return {
        date: item._id,
        total: item.totalRecords,
        present: item.presentCount,
        absent: item.absentCount,
        attendancePercentage: parseFloat(attendancePercentage),
      };
    });

    res.json({
      success: true,
      trendData: formattedTrend,
    });
  } catch (error) {
    logger.error(`Get trend data error: ${error.message}`);
    next(error);
  }
};

module.exports = {
  exportReport,
  getSummary,
  getClassWiseData,
  getTrendData,
};
