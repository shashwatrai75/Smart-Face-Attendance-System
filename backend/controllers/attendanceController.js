const Attendance = require('../models/Attendance');
const AttendanceSession = require('../models/AttendanceSession');
const ClassSession = require('../models/ClassSession');
const Student = require('../models/Student');
const Section = require('../models/Section');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');
const { timeToMinutes, nowMinutes, todayDate, compareDates } = require('../utils/timeHelpers');

let activeSessions = new Map();

const startSession = async (req, res, next) => {
  try {
    const { classSessionId, sectionId } = req.body;

    let resolvedSectionId = sectionId;
    let resolvedClassSessionId = classSessionId || null;
    let lecturerId = req.user._id;
    let section = null;

    if (classSessionId) {
      const classSession = await ClassSession.findById(classSessionId).populate('sectionId');
      if (!classSession) {
        return res.status(404).json({ error: 'Class session not found' });
      }
      section = classSession.sectionId;
      if (!section || section.sectionType !== 'class') {
        return res.status(400).json({ error: 'Class session must belong to a class-type section' });
      }
      if (req.user.role === 'lecturer' && classSession.teacherId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Access denied to this class session' });
      }
      resolvedSectionId = section._id.toString();
      lecturerId = classSession.teacherId;
    } else if (sectionId) {
      section = await Section.findById(sectionId);
      if (!section) {
        return res.status(404).json({ error: 'Section not found' });
      }
      if (section.sectionType !== 'class') {
        return res.status(400).json({ error: 'Session-based attendance is only for class-type sections' });
      }
    } else {
      return res.status(400).json({ error: 'classSessionId or sectionId is required' });
    }

    const today = todayDate();
    const nowMin = nowMinutes();

    if (section.startDate && compareDates(today, section.startDate) < 0) {
      return res.status(400).json({
        error: `Attendance is only allowed from ${section.startDate}. Today is ${today}.`,
      });
    }
    if (section.endDate && compareDates(today, section.endDate) > 0) {
      return res.status(400).json({
        error: `Attendance is only allowed until ${section.endDate}. Today is ${today}.`,
      });
    }
    if (section.startTime && section.endTime) {
      const startM = timeToMinutes(section.startTime);
      const endM = timeToMinutes(section.endTime);
      if (nowMin < startM) {
        return res.status(400).json({
          error: `Attendance is only allowed between ${section.startTime} and ${section.endTime}. Current time is too early.`,
        });
      }
      if (nowMin > endM) {
        return res.status(400).json({
          error: `Attendance is only allowed between ${section.startTime} and ${section.endTime}. Current time is too late.`,
        });
      }
    }

    const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date();
    const totalStudents = await Student.countDocuments({ sectionId: resolvedSectionId });

    await AttendanceSession.create({
      sessionId,
      sectionId: resolvedSectionId,
      classSessionId: resolvedClassSessionId,
      lecturerId,
      startTime,
      date: today,
      totalStudents,
      status: 'active',
    });

    activeSessions.set(sessionId, {
      sectionId: resolvedSectionId,
      classSessionId: resolvedClassSessionId,
      lecturerId,
      date: today,
      createdAt: startTime,
    });

    res.json({
      success: true,
      sessionId,
      sectionId: resolvedSectionId,
      classSessionId: resolvedClassSessionId,
      date: today,
      startTime: startTime.toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

const markAttendance = async (req, res, next) => {
  try {
    const { sessionId, sectionId, classSessionId, recognizedStudents } = req.body;

    if (!sessionId || !Array.isArray(recognizedStudents)) {
      return res.status(400).json({ error: 'Invalid request data: sessionId and recognizedStudents required' });
    }

    const session = activeSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    const resolvedSectionId = sectionId || session.sectionId;
    if (!resolvedSectionId) {
      return res.status(400).json({ error: 'Section ID is required for attendance' });
    }

    const resolvedClassSessionId = classSessionId || session.classSessionId || null;
    const lecturerId = session.lecturerId || req.user._id;

    const sessionDoc = await AttendanceSession.findOne({ sessionId });
    if (!sessionDoc) {
      return res.status(404).json({ error: 'Session document not found' });
    }

    const today = new Date().toISOString().split('T')[0];
    const results = [];
    const LATE_THRESHOLD_MINUTES = 5;
    const MAX_CONSECUTIVE_LATE = 3;

    for (const record of recognizedStudents) {
      const { studentId, status, time, capturedOffline } = record;

      try {
        const currentTime = new Date();
        const lastScanTime = currentTime;
        const sessionStartTime = new Date(sessionDoc.startTime);
        const minutesLate = (currentTime - sessionStartTime) / (1000 * 60);
        const isLate = minutesLate > LATE_THRESHOLD_MINUTES;

        const previousAttendances = await Attendance.find({
          studentId,
          sectionId: resolvedSectionId,
          date: { $lt: today },
        })
          .sort({ date: -1 })
          .limit(3);

        let consecutiveLateCount = 0;
        for (let i = 0; i < previousAttendances.length; i++) {
          if (previousAttendances[i].status === 'late') {
            consecutiveLateCount++;
          } else {
            break;
          }
        }

        let finalStatus = status || 'present';
        let finalConsecutiveLateCount = consecutiveLateCount;

        if (!status) {
          if (isLate) {
            finalConsecutiveLateCount = consecutiveLateCount + 1;
            if (finalConsecutiveLateCount >= MAX_CONSECUTIVE_LATE) {
              finalStatus = 'absent';
              finalConsecutiveLateCount = 0;
            } else {
              finalStatus = 'late';
            }
          } else {
            finalConsecutiveLateCount = 0;
            finalStatus = 'present';
          }
        } else if (status === 'present' && isLate) {
          finalConsecutiveLateCount = consecutiveLateCount + 1;
          if (finalConsecutiveLateCount >= MAX_CONSECUTIVE_LATE) {
            finalStatus = 'absent';
            finalConsecutiveLateCount = 0;
          } else {
            finalStatus = 'late';
          }
        } else if (status === 'present' && !isLate) {
          finalConsecutiveLateCount = 0;
        }

        const filter = resolvedClassSessionId
          ? { studentId, classSessionId: resolvedClassSessionId, date: today }
          : { studentId, sectionId: resolvedSectionId, date: today, sessionId };

        const update = {
          studentId,
          sectionId: resolvedSectionId,
          lecturerId,
          date: today,
          time: time || new Date().toTimeString().split(' ')[0],
          lastScanTime,
          status: finalStatus,
          consecutiveLateCount: finalConsecutiveLateCount,
          capturedOffline: capturedOffline || false,
          sessionId: resolvedClassSessionId ? null : sessionId,
          classSessionId: resolvedClassSessionId,
        };

        const attendance = await Attendance.findOneAndUpdate(filter, update, {
          upsert: true,
          new: true,
          runValidators: true,
        });

        results.push({
          studentId,
          attendanceId: attendance._id,
          status: 'saved',
          isLate,
          finalStatus,
          consecutiveLateCount: finalConsecutiveLateCount,
        });
      } catch (error) {
        if (error.code === 11000) {
          results.push({ studentId, status: 'duplicate' });
        } else {
          logger.error(`Error marking attendance for student ${studentId}: ${error.message}`);
          results.push({ studentId, status: 'error', error: error.message });
        }
      }
    }

    await AuditLog.create({
      actorUserId: req.user._id,
      action: 'MARK_ATTENDANCE',
      metadata: { sessionId, sectionId: resolvedSectionId, classSessionId: resolvedClassSessionId, count: recognizedStudents.length },
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
      .populate('sectionId', 'sectionName sectionType');

    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

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
    const { sectionId, dateFrom, dateTo, studentId } = req.query;

    let query = {};

    if (sectionId) query.sectionId = sectionId;
    if (studentId) query.studentId = studentId;
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = dateFrom;
      if (dateTo) query.date.$lte = dateTo;
    }

    if (user.role === 'superadmin' || user.role === 'admin') {
      // no extra filters
    } else if (user.role === 'lecturer') {
      const taughtSessions = await ClassSession.find({ teacherId: user._id }).select('sectionId');
      const sectionIds = taughtSessions.map((s) => s.sectionId);
      if (user.sectionId) sectionIds.push(user.sectionId);
      if (sectionIds.length === 0) {
        return res.json({ success: true, attendance: [], count: 0 });
      }
      if (sectionId && !sectionIds.some((s) => s && s.toString() === sectionId)) {
        return res.status(403).json({ error: 'Access denied to this section' });
      }
      query.sectionId = sectionId || { $in: sectionIds };
    } else {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const attendance = await Attendance.find(query)
      .populate('studentId', 'fullName rollNo')
      .populate('sectionId', 'sectionName sectionType')
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

const getSessionHistory = async (req, res, next) => {
  try {
    const user = req.user;
    const { sectionId, startDate, endDate } = req.query;

    let query = { status: 'completed' };
    if (sectionId) query.sectionId = sectionId;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    if (user.role === 'superadmin' || user.role === 'admin') {
      // no extra filters
    } else if (user.role === 'lecturer') {
      const taughtSessions = await ClassSession.find({ teacherId: user._id }).select('sectionId');
      const sectionIds = taughtSessions.map((s) => s.sectionId);
      if (user.sectionId) sectionIds.push(user.sectionId);
      if (sectionIds.length === 0) {
        return res.json({ success: true, sessions: [], count: 0 });
      }
      query.sectionId = sectionId || { $in: sectionIds };
      query.lecturerId = user._id;
    } else {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const sessions = await AttendanceSession.find(query)
      .populate('sectionId', 'sectionName sectionType')
      .populate('lecturerId', 'name')
      .sort({ date: -1, startTime: -1 })
      .limit(500);

    const sessionsWithDuration = await Promise.all(
      sessions.map(async (session) => {
        let presentCount = session.presentCount;
        let absentCount = session.absentCount;
        let lateCount = session.lateCount;

        const attendanceStats = await Attendance.aggregate([
          { $match: { $or: [{ sessionId: session.sessionId }, { classSessionId: session.classSessionId }] } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        presentCount = attendanceStats.find((s) => s._id === 'present')?.count || 0;
        absentCount = attendanceStats.find((s) => s._id === 'absent')?.count || 0;
        lateCount = attendanceStats.find((s) => s._id === 'late')?.count || 0;

        const duration = session.endTime ? Math.round((session.endTime - session.startTime) / 1000) : 0;
        const formatDuration = (sec) => {
          if (sec < 60) return `${sec}s`;
          const m = Math.floor(sec / 60);
          const s = sec % 60;
          if (m < 60) return `${m}m ${s}s`;
          const h = Math.floor(m / 60);
          const min = m % 60;
          return `${h}h ${min}m`;
        };

        return {
          _id: session._id,
          sessionId: session.sessionId,
          date: session.date,
          sectionId: session.sectionId,
          sectionName: session.sectionId?.sectionName || 'N/A',
          lecturerName: session.lecturerId?.name || 'N/A',
          totalStudents: session.totalStudents,
          presentCount,
          absentCount,
          lateCount,
          startTime: session.startTime,
          endTime: session.endTime,
          duration: formatDuration(duration),
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

const getSessionDetails = async (req, res, next) => {
  try {
    const user = req.user;
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const session = await AttendanceSession.findOne({ sessionId })
      .populate('sectionId', 'sectionName sectionType')
      .populate('lecturerId', 'name');

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (user.role === 'lecturer') {
      const taughtSessions = await ClassSession.find({ teacherId: user._id }).select('sectionId');
      const sectionIds = taughtSessions.map((s) => s && s.sectionId && s.sectionId.toString());
      if (user.sectionId) sectionIds.push(user.sectionId.toString());
      const sessionSectionId = session.sectionId?._id?.toString() || session.sectionId?.toString();
      if (!sessionSectionId || !sectionIds.includes(sessionSectionId)) {
        return res.status(403).json({ error: 'Access denied to this session' });
      }
    }

    const attendanceRecords = await Attendance.find({
      $or: [{ sessionId }, { classSessionId: session.classSessionId }],
    })
      .populate('studentId', 'fullName rollNo')
      .sort({ time: 1 });

    const allStudents = await Student.find({ sectionId: session.sectionId }).select('_id fullName rollNo guardianName guardianPhone dateOfBirth gender');
    const attendanceMap = new Map();
    attendanceRecords.forEach((r) => attendanceMap.set(r.studentId._id.toString(), r));

    const studentAttendance = allStudents.map((student) => {
      const record = attendanceMap.get(student._id.toString());
      if (record) {
        return {
          studentId: student._id,
          studentName: student.fullName,
          rollNo: student.rollNo,
          guardianName: student.guardianName,
          guardianPhone: student.guardianPhone,
          dateOfBirth: student.dateOfBirth,
          gender: student.gender,
          status: record.status,
          timestamp: `${record.date} ${record.time}`,
          time: record.time,
          lastScanTime: record.lastScanTime || null,
          consecutiveLateCount: record.consecutiveLateCount || 0,
          remark: record.remark || null,
        };
      }
      return {
        studentId: student._id,
        studentName: student.fullName,
        rollNo: student.rollNo,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        status: 'absent',
        timestamp: null,
        time: null,
        lastScanTime: null,
        consecutiveLateCount: 0,
        remark: null,
      };
    });

    const duration = session.endTime ? Math.round((session.endTime - session.startTime) / 1000) : 0;
    const formatDuration = (sec) => (sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m ${sec % 60}s`);

    res.json({
      success: true,
      session: {
        _id: session._id,
        sessionId: session.sessionId,
        date: session.date,
        sectionName: session.sectionId?.sectionName || 'N/A',
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

const getCalendarAttendance = async (req, res, next) => {
  try {
    const user = req.user;
    const { month, year, sectionId, studentId, lecturerId } = req.query;

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (isNaN(m) || isNaN(y) || m < 1 || m > 12) {
      return res.status(400).json({ error: 'Valid month (1-12) and year are required' });
    }

    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    let query = { date: { $gte: startDate, $lte: endDate } };
    if (sectionId) query.sectionId = sectionId;
    if (studentId) query.studentId = studentId;
    if (lecturerId) query.lecturerId = lecturerId;

    if (user.role === 'superadmin' || user.role === 'admin') {
      // no extra filters
    } else if (user.role === 'lecturer') {
      const taughtSessions = await ClassSession.find({ teacherId: user._id }).select('sectionId');
      const sectionIds = taughtSessions.map((s) => s.sectionId);
      if (user.sectionId) sectionIds.push(user.sectionId);
      if (sectionIds.length === 0) {
        return res.json({
          success: true,
          byDate: {},
          details: [],
          summary: { totalPresent: 0, totalLate: 0, totalAbsent: 0, attendancePercent: 0 },
        });
      }
      query.sectionId = sectionId || { $in: sectionIds };
    } else {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const attendance = await Attendance.find(query)
      .populate('studentId', 'fullName rollNo')
      .populate('sectionId', 'sectionName sectionType')
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

    if (session.lecturerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const sessionDoc = await AttendanceSession.findOne({ sessionId });
    if (sessionDoc) {
      const endTime = new Date();
      const attendanceStats = await Attendance.aggregate([
        { $match: { $or: [{ sessionId }, { classSessionId: session.classSessionId }] } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);
      sessionDoc.endTime = endTime;
      sessionDoc.presentCount = attendanceStats.find((s) => s._id === 'present')?.count || 0;
      sessionDoc.absentCount = attendanceStats.find((s) => s._id === 'absent')?.count || 0;
      sessionDoc.lateCount = attendanceStats.find((s) => s._id === 'late')?.count || 0;
      sessionDoc.status = 'completed';
      await sessionDoc.save();
    }

    activeSessions.delete(sessionId);

    await AuditLog.create({
      actorUserId: req.user._id,
      action: 'END_SESSION',
      metadata: { sessionId, sectionId: session.sectionId },
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
