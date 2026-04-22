const Attendance = require('../models/Attendance');
const AttendanceSession = require('../models/AttendanceSession');
const ClassSession = require('../models/ClassSession');
const Section = require('../models/Section');
const Student = require('../models/Student');
const { exportAttendance } = require('../utils/excelExport');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

function toObjectId(id) {
  if (id == null || String(id).trim() === '') return null;
  const s = String(id).trim();
  return mongoose.Types.ObjectId.isValid(s) ? new mongoose.Types.ObjectId(s) : null;
}

/**
 * Resolves which sections apply for report queries (optional sectionId, optional classId, member scope).
 * sectionId wins over classId when both are sent.
 */
async function resolveReportSectionScope(user, { sectionId, classId }) {
  const secTrim = sectionId != null && String(sectionId).trim() !== '' ? String(sectionId).trim() : '';
  const clsTrim =
    classId != null && String(classId).trim() !== '' && !secTrim ? String(classId).trim() : '';

  let allowedForMember = null;
  if (user.role === 'member') {
    const taught = await ClassSession.find({ teacherId: user._id }).select('sectionId').lean();
    const raw = taught.map((s) => s.sectionId).filter(Boolean);
    if (user.sectionId) raw.push(user.sectionId);
    const seen = new Set();
    allowedForMember = [];
    for (const x of raw) {
      const k = x.toString();
      if (!seen.has(k)) {
        seen.add(k);
        allowedForMember.push(x);
      }
    }
    if (allowedForMember.length === 0) {
      return { kind: 'empty_member' };
    }
  }

  const intersect = (ids) => {
    if (!allowedForMember) return ids;
    const allow = new Set(allowedForMember.map((x) => x.toString()));
    return ids.filter((id) => allow.has(id.toString()));
  };

  if (secTrim) {
    const sid = toObjectId(secTrim);
    if (!sid) return { kind: 'bad_params' };
    if (allowedForMember && !allowedForMember.some((x) => x.equals(sid))) {
      return { kind: 'forbidden' };
    }
    return {
      kind: 'ok',
      sectionQuery: { _id: sid },
      attendanceSectionFilter: sid,
      studentSectionIds: [sid],
    };
  }

  if (clsTrim) {
    const cid = toObjectId(clsTrim);
    if (!cid) return { kind: 'bad_params' };
    const children = await Section.find({ parentSectionId: cid }).select('_id').lean();
    let ids = children.map((c) => c._id);
    ids.push(cid);
    ids = intersect(ids);
    if (ids.length === 0) {
      return {
        kind: 'ok',
        sectionQuery: { _id: { $in: [] } },
        attendanceSectionFilter: { $in: [] },
        studentSectionIds: [],
      };
    }
    return {
      kind: 'ok',
      sectionQuery: { _id: { $in: ids } },
      attendanceSectionFilter: { $in: ids },
      studentSectionIds: ids,
    };
  }

  if (allowedForMember) {
    return {
      kind: 'ok',
      sectionQuery: { _id: { $in: allowedForMember } },
      attendanceSectionFilter: { $in: allowedForMember },
      studentSectionIds: allowedForMember,
    };
  }

  return {
    kind: 'ok',
    sectionQuery: {},
    attendanceSectionFilter: undefined,
    studentSectionIds: null,
  };
}

function applyAttendanceSectionFilter(attendanceQuery, filter) {
  if (filter === undefined) return;
  if (filter && filter.$in && filter.$in.length === 0) {
    attendanceQuery.sectionId = { $in: [] };
    return;
  }
  attendanceQuery.sectionId = filter;
}

function applySessionSectionFilter(sessionQuery, filter, { memberLecturerId }) {
  if (memberLecturerId) {
    sessionQuery.lecturerId = memberLecturerId;
  }
  if (filter === undefined) return;
  if (filter && filter.$in && filter.$in.length === 0) {
    sessionQuery.sectionId = { $in: [] };
    return;
  }
  sessionQuery.sectionId = filter;
}

function handleScopeError(res, scope) {
  if (scope.kind === 'forbidden') {
    res.status(403).json({ error: 'Access denied to this section' });
    return true;
  }
  if (scope.kind === 'bad_params') {
    res.status(400).json({ error: 'Invalid section or class id' });
    return true;
  }
  return false;
}

const exportReport = async (req, res, next) => {
  try {
    const user = req.user;
    const { sectionId, classId, dateFrom, dateTo, format = 'xlsx' } = req.query;

    if (!['superadmin', 'admin', 'hr', 'member'].includes(user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const secTrim = sectionId != null && String(sectionId).trim() !== '';
    const clsTrim = classId != null && String(classId).trim() !== '';

    // Empty class + empty section = same scope as charts/summary (member: only their sections; admin/hr: all).
    const scope = await resolveReportSectionScope(user, {
      sectionId: secTrim ? String(sectionId).trim() : '',
      classId: secTrim ? '' : (clsTrim ? String(classId).trim() : ''),
    });

    if (scope.kind === 'empty_member') {
      return res.status(403).json({ error: 'No sections available to export for your account' });
    }
    if (handleScopeError(res, scope)) return;

    const attendanceQuery = {};
    applyAttendanceSectionFilter(attendanceQuery, scope.attendanceSectionFilter);

    if (
      scope.attendanceSectionFilter &&
      scope.attendanceSectionFilter.$in &&
      scope.attendanceSectionFilter.$in.length === 0
    ) {
      return res.status(404).json({ error: 'No attendance records found' });
    }

    if (dateFrom || dateTo) {
      attendanceQuery.date = {};
      if (dateFrom) attendanceQuery.date.$gte = dateFrom;
      if (dateTo) attendanceQuery.date.$lte = dateTo;
    }

    const attendance = await Attendance.find(attendanceQuery)
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
      rollNo: record.studentId?.rollNo ?? '',
      sectionName: record.sectionId?.sectionName || '',
      teacherName: record.lecturerId?.name || '',
      status: record.status,
    }));

    const buffer = await exportAttendance(exportData, format);

    const slug = secTrim
      ? String(sectionId).trim()
      : clsTrim
        ? `class-${String(classId).trim()}`
        : 'all-sections';
    const ext = format === 'csv' ? 'csv' : 'xlsx';
    const filename = `attendance-${slug}-${dateFrom || 'all'}-${dateTo || 'all'}.${ext}`;
    const contentType =
      format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

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
    const { startDate, endDate, sectionId, classId } = req.query;

    if (!['superadmin', 'admin', 'hr', 'member'].includes(user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const scope = await resolveReportSectionScope(user, { sectionId, classId });
    if (scope.kind === 'empty_member') {
      return res.json({
        success: true,
        summary: {
          totalSections: 0,
          totalStudents: 0,
          averageAttendance: 0,
          totalSessions: 0,
          totalAttendanceRecords: 0,
        },
      });
    }
    if (handleScopeError(res, scope)) return;

    const attendanceQuery = {};
    applyAttendanceSectionFilter(attendanceQuery, scope.attendanceSectionFilter);

    const sessionQuery = { status: { $in: ['active', 'completed'] } };
    applySessionSectionFilter(sessionQuery, scope.attendanceSectionFilter, {
      memberLecturerId: user.role === 'member' ? user._id : null,
    });

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

    const totalSections = await Section.countDocuments(scope.sectionQuery);

    const sectionIdsForStudents =
      scope.studentSectionIds !== null
        ? scope.studentSectionIds
        : (await Section.find(scope.sectionQuery).select('_id')).map((s) => s._id);

    const totalStudents = await Student.countDocuments({
      sectionId: { $in: sectionIdsForStudents },
    });

    const totalSessions = await AttendanceSession.countDocuments(sessionQuery);

    const aggMatch = { ...attendanceQuery };
    if (aggMatch.sectionId && typeof aggMatch.sectionId === 'string' && mongoose.Types.ObjectId.isValid(aggMatch.sectionId)) {
      aggMatch.sectionId = new mongoose.Types.ObjectId(aggMatch.sectionId);
    }

    const attendanceStats = await Attendance.aggregate([
      { $match: aggMatch },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          presentLikeCount: {
            $sum: {
              $cond: [{ $in: ['$status', ['present', 'late', 'excused']] }, 1, 0],
            },
          },
        },
      },
    ]);

    const stats = attendanceStats[0] || { totalRecords: 0, presentLikeCount: 0 };
    const averageAttendance =
      stats.totalRecords > 0 ? ((stats.presentLikeCount / stats.totalRecords) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      summary: {
        totalSections,
        totalStudents,
        averageAttendance: parseFloat(averageAttendance),
        totalSessions,
        totalAttendanceRecords: stats.totalRecords,
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
    const { startDate, endDate, sectionId, classId } = req.query;

    if (!['superadmin', 'admin', 'hr', 'member'].includes(user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const scope = await resolveReportSectionScope(user, { sectionId, classId });
    if (scope.kind === 'empty_member') {
      return res.json({ success: true, classWiseData: [] });
    }
    if (handleScopeError(res, scope)) return;

    const attendanceQuery = {};
    applyAttendanceSectionFilter(attendanceQuery, scope.attendanceSectionFilter);

    if (startDate || endDate) {
      attendanceQuery.date = {};
      if (startDate) attendanceQuery.date.$gte = startDate;
      if (endDate) attendanceQuery.date.$lte = endDate;
    }

    const sections = await Section.find(scope.sectionQuery).select('_id sectionName sectionType');

    const aggMatch = { ...attendanceQuery };
    if (aggMatch.sectionId && typeof aggMatch.sectionId === 'string' && mongoose.Types.ObjectId.isValid(aggMatch.sectionId)) {
      aggMatch.sectionId = new mongoose.Types.ObjectId(aggMatch.sectionId);
    }

    const sectionStats = await Attendance.aggregate([
      { $match: aggMatch },
      {
        $group: {
          _id: '$sectionId',
          totalRecords: { $sum: 1 },
          presentCount: { $sum: { $cond: [{ $in: ['$status', ['present', 'excused']] }, 1, 0] } },
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
        stats.totalRecords > 0 ? (((stats.presentCount + stats.lateCount) / stats.totalRecords) * 100).toFixed(2) : 0;

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
    const { startDate, endDate, sectionId, classId } = req.query;

    if (!['superadmin', 'admin', 'hr', 'member'].includes(user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const scope = await resolveReportSectionScope(user, { sectionId, classId });
    if (scope.kind === 'empty_member') {
      return res.json({ success: true, trendData: [] });
    }
    if (handleScopeError(res, scope)) return;

    const attendanceQuery = {};
    applyAttendanceSectionFilter(attendanceQuery, scope.attendanceSectionFilter);

    if (startDate || endDate) {
      attendanceQuery.date = {};
      if (startDate) attendanceQuery.date.$gte = startDate;
      if (endDate) attendanceQuery.date.$lte = endDate;
    }

    const aggMatch = { ...attendanceQuery };
    if (aggMatch.sectionId && typeof aggMatch.sectionId === 'string' && mongoose.Types.ObjectId.isValid(aggMatch.sectionId)) {
      aggMatch.sectionId = new mongoose.Types.ObjectId(aggMatch.sectionId);
    }

    const trendData = await Attendance.aggregate([
      { $match: aggMatch },
      {
        $group: {
          _id: '$date',
          totalRecords: { $sum: 1 },
          presentCount: { $sum: { $cond: [{ $in: ['$status', ['present', 'excused']] }, 1, 0] } },
          lateCount: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          absentCount: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const formattedTrend = trendData.map((item) => {
      const presentLike = (item.presentCount || 0) + (item.lateCount || 0);
      const attendancePercentage =
        item.totalRecords > 0 ? ((presentLike / item.totalRecords) * 100).toFixed(2) : 0;
      return {
        date: item._id,
        total: item.totalRecords,
        present: presentLike,
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
