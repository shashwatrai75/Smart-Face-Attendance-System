const Attendance = require('../models/Attendance');
const AttendanceSession = require('../models/AttendanceSession');
const Class = require('../models/Class');
const Student = require('../models/Student');
const { exportAttendance } = require('../utils/excelExport');
const logger = require('../utils/logger');

const exportReport = async (req, res, next) => {
  try {
    const { classId, dateFrom, dateTo, format = 'xlsx' } = req.query;

    if (!classId) {
      return res.status(400).json({ error: 'Class ID is required' });
    }

    // Verify class exists and user has access
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (req.user.role === 'teacher' && classDoc.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied to this class' });
    }

    let query = { classId };

    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = dateFrom;
      if (dateTo) query.date.$lte = dateTo;
    }

    const attendance = await Attendance.find(query)
      .populate('studentId', 'fullName rollNo')
      .populate('classId', 'className')
      .populate('teacherId', 'name')
      .sort({ date: -1, time: -1 });

    if (attendance.length === 0) {
      return res.status(404).json({ error: 'No attendance records found' });
    }

    // Format data for export
    const exportData = attendance.map((record) => ({
      date: record.date,
      time: record.time,
      studentName: record.studentId.fullName,
      rollNo: record.studentId.rollNo,
      className: record.classId.className,
      status: record.status,
      teacherName: record.teacherId.name,
    }));

    const buffer = await exportAttendance(exportData, format);

    const filename = `attendance-${classId}-${dateFrom || 'all'}-${dateTo || 'all'}.${format === 'csv' ? 'csv' : 'xlsx'}`;
    const contentType = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    logger.error(`Export report error: ${error.message}`);
    next(error);
  }
};

// Get overall summary statistics
const getSummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    let classQuery = {};
    let attendanceQuery = {};
    let sessionQuery = { status: 'completed' };

    // If teacher, only show their classes
    if (req.user.role === 'teacher') {
      const teacherClasses = await Class.find({ teacherId: req.user._id }).select('_id');
      const classIds = teacherClasses.map((c) => c._id);
      classQuery._id = { $in: classIds };
      attendanceQuery.classId = { $in: classIds };
      sessionQuery.classId = { $in: classIds };
      sessionQuery.teacherId = req.user._id;
    }

    // Date filters
    if (startDate || endDate) {
      attendanceQuery.date = {};
      sessionQuery.date = {};
      if (startDate) {
        attendanceQuery.date.$gte = startDate;
        sessionQuery.date.$gte = startDate;
      }
      if (endDate) {
        attendanceQuery.date.$lte = endDate;
        sessionQuery.date.$lte = endDate;
      }
    }

    // Get total classes
    const totalClasses = await Class.countDocuments(classQuery);

    // Get total students
    let totalStudents = 0;
    if (req.user.role === 'teacher') {
      const teacherClasses = await Class.find({ teacherId: req.user._id }).select('_id');
      const classIds = teacherClasses.map((c) => c._id);
      totalStudents = await Student.countDocuments({ classId: { $in: classIds } });
    } else {
      totalStudents = await Student.countDocuments();
    }

    // Get total sessions
    const totalSessions = await AttendanceSession.countDocuments(sessionQuery);

    // Calculate average attendance percentage
    const attendanceStats = await Attendance.aggregate([
      { $match: attendanceQuery },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          presentCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'present'] }, 1, 0],
            },
          },
        },
      },
    ]);

    const stats = attendanceStats[0] || { totalRecords: 0, presentCount: 0 };
    const averageAttendance =
      stats.totalRecords > 0 ? ((stats.presentCount / stats.totalRecords) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      summary: {
        totalClasses,
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

// Get class-wise attendance data
const getClassWiseData = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    let classQuery = {};
    let attendanceQuery = {};

    // If teacher, only show their classes
    if (req.user.role === 'teacher') {
      const teacherClasses = await Class.find({ teacherId: req.user._id }).select('_id');
      const classIds = teacherClasses.map((c) => c._id);
      classQuery._id = { $in: classIds };
      attendanceQuery.classId = { $in: classIds };
    }

    // Date filters
    if (startDate || endDate) {
      attendanceQuery.date = {};
      if (startDate) attendanceQuery.date.$gte = startDate;
      if (endDate) attendanceQuery.date.$lte = endDate;
    }

    // Get all classes
    const classes = await Class.find(classQuery).select('_id className subject');

    // Get attendance stats per class
    const classStats = await Attendance.aggregate([
      { $match: attendanceQuery },
      {
        $group: {
          _id: '$classId',
          totalRecords: { $sum: 1 },
          presentCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'present'] }, 1, 0],
            },
          },
          absentCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'absent'] }, 1, 0],
            },
          },
          lateCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'late'] }, 1, 0],
            },
          },
        },
      },
    ]);

    // Create a map of class stats
    const statsMap = new Map();
    classStats.forEach((stat) => {
      statsMap.set(stat._id.toString(), stat);
    });

    // Combine class info with stats
    const classWiseData = classes.map((classDoc) => {
      const stats = statsMap.get(classDoc._id.toString()) || {
        totalRecords: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
      };

      const attendancePercentage =
        stats.totalRecords > 0
          ? ((stats.presentCount / stats.totalRecords) * 100).toFixed(2)
          : 0;

      return {
        classId: classDoc._id,
        className: classDoc.className,
        subject: classDoc.subject,
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

// Get attendance trend over time
const getTrendData = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    let attendanceQuery = {};

    // If teacher, only show their classes
    if (req.user.role === 'teacher') {
      const teacherClasses = await Class.find({ teacherId: req.user._id }).select('_id');
      const classIds = teacherClasses.map((c) => c._id);
      attendanceQuery.classId = { $in: classIds };
    }

    // Date filters
    if (startDate || endDate) {
      attendanceQuery.date = {};
      if (startDate) attendanceQuery.date.$gte = startDate;
      if (endDate) attendanceQuery.date.$lte = endDate;
    }

    // Get attendance stats grouped by date
    const trendData = await Attendance.aggregate([
      { $match: attendanceQuery },
      {
        $group: {
          _id: '$date',
          totalRecords: { $sum: 1 },
          presentCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'present'] }, 1, 0],
            },
          },
          absentCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'absent'] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Format data for chart
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

