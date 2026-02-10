const Attendance = require('../models/Attendance');
const AttendanceSession = require('../models/AttendanceSession');
const Student = require('../models/Student');
const Class = require('../models/Class');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

let activeSessions = new Map(); // In-memory session store (use Redis in production)

const startSession = async (req, res, next) => {
  try {
    const { classId } = req.body;

    if (!classId) {
      return res.status(400).json({ error: 'Class ID is required' });
    }

    // Verify class exists and teacher has access
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (req.user.role === 'teacher' && classDoc.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied to this class' });
    }

    const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const today = new Date().toISOString().split('T')[0];
    const startTime = new Date();

    // Get total students in class
    const totalStudents = await Student.countDocuments({ classId });

    // Create session record in database
    const sessionDoc = await AttendanceSession.create({
      sessionId,
      classId,
      teacherId: req.user._id,
      startTime,
      date: today,
      totalStudents,
      status: 'active',
    });

    activeSessions.set(sessionId, {
      classId,
      teacherId: req.user._id,
      date: today,
      createdAt: startTime,
    });

    res.json({
      success: true,
      sessionId,
      classId,
      date: today,
      startTime: startTime.toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

const markAttendance = async (req, res, next) => {
  try {
    const { sessionId, classId, recognizedStudents } = req.body;

    if (!sessionId || !classId || !Array.isArray(recognizedStudents)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    const session = activeSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    const today = new Date().toISOString().split('T')[0];
    const results = [];

    for (const record of recognizedStudents) {
      const { studentId, status, time, capturedOffline } = record;

      try {
        // Use upsert to prevent duplicates
        const attendance = await Attendance.findOneAndUpdate(
          {
            studentId,
            classId,
            date: today,
            sessionId,
          },
          {
            studentId,
            classId,
            teacherId: req.user._id,
            date: today,
            time: time || new Date().toTimeString().split(' ')[0],
            status: status || 'present',
            capturedOffline: capturedOffline || false,
            sessionId,
          },
          {
            upsert: true,
            new: true,
            runValidators: true,
          }
        );

        results.push({
          studentId,
          attendanceId: attendance._id,
          status: 'saved',
        });
      } catch (error) {
        if (error.code === 11000) {
          results.push({
            studentId,
            status: 'duplicate',
          });
        } else {
          logger.error(`Error marking attendance for student ${studentId}: ${error.message}`);
          results.push({
            studentId,
            status: 'error',
            error: error.message,
          });
        }
      }
    }

    await AuditLog.create({
      actorUserId: req.user._id,
      action: 'MARK_ATTENDANCE',
      metadata: { sessionId, classId, count: recognizedStudents.length },
    });

    res.json({
      success: true,
      results,
      message: `Attendance marked for ${results.filter((r) => r.status === 'saved').length} student(s)`,
    });
  } catch (error) {
    next(error);
  }
};

const manualOverride = async (req, res, next) => {
  try {
    const { attendanceId, status, remark } = req.body;

    if (!attendanceId || !status) {
      return res.status(400).json({ error: 'Attendance ID and status are required' });
    }

    if (!['present', 'absent', 'late', 'excused'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const attendance = await Attendance.findByIdAndUpdate(
      attendanceId,
      { status, remark },
      { new: true, runValidators: true }
    )
      .populate('studentId', 'fullName rollNo')
      .populate('classId', 'className');

    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    // Verify teacher has access
    if (req.user.role === 'teacher' && attendance.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      attendance,
    });
  } catch (error) {
    next(error);
  }
};

const getAttendanceHistory = async (req, res, next) => {
  try {
    const { classId, dateFrom, dateTo, studentId } = req.query;

    let query = {};

    if (classId) {
      query.classId = classId;
    }

    if (studentId) {
      query.studentId = studentId;
    }

    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = dateFrom;
      if (dateTo) query.date.$lte = dateTo;
    }

    // If teacher, only show their classes
    if (req.user.role === 'teacher') {
      const teacherClasses = await Class.find({ teacherId: req.user._id }).select('_id');
      const classIds = teacherClasses.map((c) => c._id);
      if (classId && !classIds.includes(classId)) {
        return res.status(403).json({ error: 'Access denied to this class' });
      }
      if (!classId) {
        query.classId = { $in: classIds };
      }
    }

    const attendance = await Attendance.find(query)
      .populate('studentId', 'fullName rollNo')
      .populate('classId', 'className subject')
      .populate('teacherId', 'name')
      .sort({ date: -1, time: -1 })
      .limit(1000);

    res.json({
      success: true,
      attendance,
      count: attendance.length,
    });
  } catch (error) {
    next(error);
  }
};

// New endpoint: Get session-based attendance history
const getSessionHistory = async (req, res, next) => {
  try {
    const { classId, startDate, endDate } = req.query;

    let query = { status: 'completed' };

    if (classId) {
      query.classId = classId;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    // If teacher, only show their classes
    if (req.user.role === 'teacher') {
      const teacherClasses = await Class.find({ teacherId: req.user._id }).select('_id');
      const classIds = teacherClasses.map((c) => c._id);
      if (classId && !classIds.includes(classId)) {
        return res.status(403).json({ error: 'Access denied to this class' });
      }
      if (!classId) {
        query.classId = { $in: classIds };
      }
      query.teacherId = req.user._id;
    }

    const sessions = await AttendanceSession.find(query)
      .populate('classId', 'className subject')
      .populate('teacherId', 'name')
      .sort({ date: -1, startTime: -1 })
      .limit(500);

    // Calculate session duration and stats for each session
    const sessionsWithDuration = await Promise.all(
      sessions.map(async (session) => {
        // Recalculate stats from attendance records if missing or session is active
        let presentCount = session.presentCount;
        let absentCount = session.absentCount;
        let lateCount = session.lateCount;

        if (!session.endTime || presentCount === 0) {
          const attendanceStats = await Attendance.aggregate([
            { $match: { sessionId: session.sessionId } },
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ]);

          presentCount = attendanceStats.find((s) => s._id === 'present')?.count || 0;
          absentCount = attendanceStats.find((s) => s._id === 'absent')?.count || 0;
          lateCount = attendanceStats.find((s) => s._id === 'late')?.count || 0;

          // Update session if stats were missing
          if (!session.endTime || session.presentCount === 0) {
            session.presentCount = presentCount;
            session.absentCount = absentCount;
            session.lateCount = lateCount;
            if (session.endTime) {
              await session.save();
            }
          }
        }

        const duration = session.endTime
          ? Math.round((session.endTime - session.startTime) / 1000) // Duration in seconds
          : 0;

        const formatDuration = (seconds) => {
          if (seconds < 60) return `${seconds}s`;
          const minutes = Math.floor(seconds / 60);
          const secs = seconds % 60;
          if (minutes < 60) return `${minutes}m ${secs}s`;
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;
          return `${hours}h ${mins}m`;
        };

        return {
          _id: session._id,
          sessionId: session.sessionId,
          date: session.date,
          classId: session.classId,
          className: session.classId?.className || 'N/A',
          subject: session.classId?.subject || 'N/A',
          teacherName: session.teacherId?.name || 'N/A',
          totalStudents: session.totalStudents,
          presentCount,
          absentCount,
          lateCount,
          startTime: session.startTime,
          endTime: session.endTime,
          duration: formatDuration(duration),
          durationSeconds: duration,
        };
      })
    );

    res.json({
      success: true,
      sessions: sessionsWithDuration,
      count: sessionsWithDuration.length,
    });
  } catch (error) {
    next(error);
  }
};

// New endpoint: Get detailed attendance for a specific session
const getSessionDetails = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Find session
    const session = await AttendanceSession.findOne({ sessionId })
      .populate('classId', 'className subject')
      .populate('teacherId', 'name');

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify access
    if (req.user.role === 'teacher' && session.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied to this session' });
    }

    // Get all attendance records for this session
    const attendanceRecords = await Attendance.find({ sessionId })
      .populate('studentId', 'fullName rollNo')
      .sort({ time: 1 });

    // Get all students in the class to show absent ones
    const allStudents = await Student.find({ classId: session.classId }).select('_id fullName rollNo');
    const presentStudentIds = new Set(attendanceRecords.map((r) => r.studentId._id.toString()));

    // Create a map of attendance records by student ID
    const attendanceMap = new Map();
    attendanceRecords.forEach((record) => {
      attendanceMap.set(record.studentId._id.toString(), record);
    });

    // Build complete student list with attendance status
    const studentAttendance = allStudents.map((student) => {
      const record = attendanceMap.get(student._id.toString());
      if (record) {
        return {
          studentId: student._id,
          studentName: student.fullName,
          rollNo: student.rollNo,
          status: record.status,
          timestamp: `${record.date} ${record.time}`,
          time: record.time,
          remark: record.remark || null,
        };
      } else {
        return {
          studentId: student._id,
          studentName: student.fullName,
          rollNo: student.rollNo,
          status: 'absent',
          timestamp: null,
          time: null,
          remark: null,
        };
      }
    });

    // Format duration
    const duration = session.endTime
      ? Math.round((session.endTime - session.startTime) / 1000)
      : 0;
    const formatDuration = (seconds) => {
      if (seconds < 60) return `${seconds}s`;
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      if (minutes < 60) return `${minutes}m ${secs}s`;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    };

    res.json({
      success: true,
      session: {
        _id: session._id,
        sessionId: session.sessionId,
        date: session.date,
        className: session.classId?.className || 'N/A',
        subject: session.classId?.subject || 'N/A',
        teacherName: session.teacherId?.name || 'N/A',
        startTime: session.startTime,
        endTime: session.endTime,
        duration: formatDuration(duration),
        totalStudents: session.totalStudents,
        presentCount: session.presentCount,
        absentCount: session.absentCount,
        lateCount: session.lateCount,
      },
      studentAttendance,
    });
  } catch (error) {
    next(error);
  }
};

const endSession = async (req, res, next) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const session = activeSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify teacher owns this session
    if (session.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update session in database
    const sessionDoc = await AttendanceSession.findOne({ sessionId });
    if (sessionDoc) {
      const endTime = new Date();
      const duration = Math.round((endTime - sessionDoc.startTime) / 1000); // Duration in seconds

      // Count attendance records for this session
      const attendanceStats = await Attendance.aggregate([
        { $match: { sessionId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      const presentCount = attendanceStats.find((s) => s._id === 'present')?.count || 0;
      const absentCount = attendanceStats.find((s) => s._id === 'absent')?.count || 0;
      const lateCount = attendanceStats.find((s) => s._id === 'late')?.count || 0;

      sessionDoc.endTime = endTime;
      sessionDoc.presentCount = presentCount;
      sessionDoc.absentCount = absentCount;
      sessionDoc.lateCount = lateCount;
      sessionDoc.status = 'completed';
      await sessionDoc.save();
    }

    // Remove from active sessions
    activeSessions.delete(sessionId);

    await AuditLog.create({
      actorUserId: req.user._id,
      action: 'END_SESSION',
      metadata: { sessionId, classId: session.classId },
    });

    res.json({
      success: true,
      message: 'Session ended successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  startSession,
  markAttendance,
  manualOverride,
  getAttendanceHistory,
  getSessionHistory,
  getSessionDetails,
  endSession,
};

