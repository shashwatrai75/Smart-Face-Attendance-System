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

    if (req.user.role === 'lecturer' && classDoc.lecturerId.toString() !== req.user._id.toString()) {
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
      lecturerId: req.user._id,
      startTime,
      date: today,
      totalStudents,
      status: 'active',
    });

    activeSessions.set(sessionId, {
      classId,
      lecturerId: req.user._id,
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

    // Get session document to access startTime
    const sessionDoc = await AttendanceSession.findOne({ sessionId });
    if (!sessionDoc) {
      return res.status(404).json({ error: 'Session document not found' });
    }

    const today = new Date().toISOString().split('T')[0];
    const results = [];
    const LATE_THRESHOLD_MINUTES = 5; // Consider late if more than 5 minutes after session start
    const MAX_CONSECUTIVE_LATE = 3; // Mark as absent after 3 consecutive late attendances

    for (const record of recognizedStudents) {
      const { studentId, status, time, capturedOffline } = record;

      try {
        const currentTime = new Date();
        const lastScanTime = currentTime;
        
        // Calculate if attendance is late (more than threshold minutes after session start)
        const sessionStartTime = new Date(sessionDoc.startTime);
        const minutesLate = (currentTime - sessionStartTime) / (1000 * 60);
        const isLate = minutesLate > LATE_THRESHOLD_MINUTES;

        // Get previous attendance records to check consecutive late count
        const previousAttendances = await Attendance.find({
          studentId,
          classId,
          date: { $lt: today }, // Previous dates only
        })
          .sort({ date: -1 })
          .limit(3);

        // Check if previous attendances were late (consecutive)
        let consecutiveLateCount = 0;
        for (let i = 0; i < previousAttendances.length; i++) {
          if (previousAttendances[i].status === 'late') {
            consecutiveLateCount++;
          } else {
            break; // Break on first non-late attendance
          }
        }

        // Determine final status
        let finalStatus = status || 'present';
        let finalConsecutiveLateCount = consecutiveLateCount;

        if (!status) {
          // Auto-detect status if not manually set
          if (isLate) {
            finalConsecutiveLateCount = consecutiveLateCount + 1;
            // If 3 consecutive late attendances, mark as absent
            if (finalConsecutiveLateCount >= MAX_CONSECUTIVE_LATE) {
              finalStatus = 'absent';
              finalConsecutiveLateCount = 0; // Reset counter
            } else {
              finalStatus = 'late';
            }
          } else {
            // On time, reset consecutive late count
            finalConsecutiveLateCount = 0;
            finalStatus = 'present';
          }
        } else if (status === 'present' && isLate) {
          // If manually marked present but is late, override to late
          finalConsecutiveLateCount = consecutiveLateCount + 1;
          if (finalConsecutiveLateCount >= MAX_CONSECUTIVE_LATE) {
            finalStatus = 'absent';
            finalConsecutiveLateCount = 0;
          } else {
            finalStatus = 'late';
          }
        } else if (status === 'present' && !isLate) {
          // On time, reset consecutive late count
          finalConsecutiveLateCount = 0;
        }

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
            lecturerId: req.user._id,
            date: today,
            time: time || new Date().toTimeString().split(' ')[0],
            lastScanTime: lastScanTime,
            status: finalStatus,
            consecutiveLateCount: finalConsecutiveLateCount,
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
          isLate: isLate,
          finalStatus: finalStatus,
          consecutiveLateCount: finalConsecutiveLateCount,
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

    // Verify lecturer has access
    if (req.user.role === 'lecturer' && attendance.lecturerId.toString() !== req.user._id.toString()) {
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
    const user = req.user;
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

    // Role-based visibility: superadmin/admin see all, lecturer sees assigned classes only, viewer sees own only
    if (user.role === 'superadmin' || user.role === 'admin') {
      // Return all attendance - no extra filters
    } else if (user.role === 'lecturer') {
      // Lecturer: only student attendance in their assigned classes (classes where they are lecturer)
      const assignedClasses = await Class.find({ lecturerId: user._id }).select('_id');
      const classIds = assignedClasses.map((c) => c._id);
      if (classIds.length === 0) {
        return res.json({ success: true, attendance: [], count: 0 });
      }
      if (classId && !classIds.some((c) => c.toString() === classId)) {
        return res.status(403).json({ error: 'Access denied. You do not have access to this class.' });
      }
      query.classId = classId ? classId : { $in: classIds };
    } else if (user.role === 'viewer') {
      // Viewer: only their own attendance (studentId must match linked student)
      const linkedStudentId = user.linkedStudentId;
      if (!linkedStudentId) {
        return res.status(403).json({ error: 'Your account is not linked to a student record. Contact administrator.' });
      }
      query.studentId = linkedStudentId;
    } else {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }

    const attendance = await Attendance.find(query)
      .populate('studentId', 'fullName rollNo')
      .populate('classId', 'className subject')
      .populate('lecturerId', 'name')
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
    const user = req.user;
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

    // Role-based visibility
    if (user.role === 'superadmin' || user.role === 'admin') {
      // Return all sessions
    } else if (user.role === 'lecturer') {
      const assignedClasses = await Class.find({ lecturerId: user._id }).select('_id');
      const classIds = assignedClasses.map((c) => c._id);
      if (classIds.length === 0) {
        return res.json({ success: true, sessions: [], count: 0 });
      }
      if (classId && !classIds.some((c) => c.toString() === classId)) {
        return res.status(403).json({ error: 'Access denied. You do not have access to this class.' });
      }
      query.classId = classId ? classId : { $in: classIds };
      query.lecturerId = user._id;
    } else if (user.role === 'viewer') {
      // Viewer: cannot see session list (sessions are teacher activity); return empty
      return res.json({ success: true, sessions: [], count: 0 });
    } else {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }

    const sessions = await AttendanceSession.find(query)
      .populate('classId', 'className subject')
      .populate('lecturerId', 'name')
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
          lecturerName: session.lecturerId?.name || 'N/A',
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
    const user = req.user;
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Viewer cannot access session details (teacher activity)
    if (user.role === 'viewer') {
      return res.status(403).json({ error: 'Access denied. You can only view your own attendance records.' });
    }

    // Find session
    const session = await AttendanceSession.findOne({ sessionId })
      .populate('classId', 'className subject')
      .populate('lecturerId', 'name');

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify access for lecturer (admin/superadmin can access any)
    if (user.role === 'lecturer') {
      const assignedClasses = await Class.find({ lecturerId: user._id }).select('_id');
      const classIds = assignedClasses.map((c) => c.toString());
      const sessionClassId = session.classId?._id?.toString() || session.classId?.toString();
      if (!sessionClassId || !classIds.includes(sessionClassId)) {
        return res.status(403).json({ error: 'Access denied to this session' });
      }
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
          lastScanTime: record.lastScanTime || null,
          consecutiveLateCount: record.consecutiveLateCount || 0,
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
          lastScanTime: null,
          consecutiveLateCount: 0,
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
        lecturerName: session.lecturerId?.name || 'N/A',
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

// Calendar endpoint: get attendance aggregated by date for calendar view
const getCalendarAttendance = async (req, res, next) => {
  try {
    const user = req.user;
    const { month, year, classId, studentId, lecturerId } = req.query;

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (isNaN(m) || isNaN(y) || m < 1 || m > 12) {
      return res.status(400).json({ error: 'Valid month (1-12) and year are required' });
    }

    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    let query = { date: { $gte: startDate, $lte: endDate } };

    if (classId) query.classId = classId;
    if (studentId) query.studentId = studentId;
    if (lecturerId) query.lecturerId = lecturerId;

    // Role-based filtering (backend enforcement)
    if (user.role === 'superadmin' || user.role === 'admin') {
      // No extra filters - can use classId, studentId, lecturerId from query
    } else if (user.role === 'lecturer') {
      const assignedClasses = await Class.find({ lecturerId: user._id }).select('_id');
      const classIds = assignedClasses.map((c) => c._id);
      if (classIds.length === 0) {
        return res.json({ success: true, byDate: {}, details: [], summary: { totalPresent: 0, totalLate: 0, totalAbsent: 0, attendancePercent: 0 } });
      }
      if (classId && !classIds.some((c) => c.toString() === classId)) {
        return res.status(403).json({ error: 'Access denied to this class.' });
      }
      query.classId = classId || { $in: classIds };
    } else if (user.role === 'viewer') {
      const linkedStudentId = user.linkedStudentId;
      if (!linkedStudentId) {
        return res.status(403).json({ error: 'Your account is not linked to a student record.' });
      }
      query.studentId = linkedStudentId;
    } else {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const attendance = await Attendance.find(query)
      .populate('studentId', 'fullName rollNo')
      .populate('classId', 'className subject')
      .populate('lecturerId', 'name')
      .sort({ date: 1, time: 1 });

    const byDate = {};
    let totalPresent = 0;
    let totalLate = 0;
    let totalAbsent = 0;

    attendance.forEach((rec) => {
      const d = rec.date;
      if (!byDate[d]) byDate[d] = { present: 0, late: 0, absent: 0 };
      const s = rec.status || 'present';
      if (s === 'present' || s === 'excused') {
        byDate[d].present++;
        totalPresent++;
      } else if (s === 'late') {
        byDate[d].late++;
        totalLate++;
      } else {
        byDate[d].absent++;
        totalAbsent++;
      }
    });

    const total = totalPresent + totalLate + totalAbsent;
    const attendancePercent = total > 0 ? Math.round((totalPresent / total) * 100) : 0;

    res.json({
      success: true,
      byDate,
      details: attendance,
      summary: { totalPresent, totalLate, totalAbsent, attendancePercent },
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

    // Verify lecturer owns this session
    if (session.lecturerId.toString() !== req.user._id.toString()) {
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
  getCalendarAttendance,
  endSession,
};

