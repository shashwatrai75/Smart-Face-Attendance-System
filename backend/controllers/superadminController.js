const AuditLog = require('../models/AuditLog');
const SystemSettings = require('../models/SystemSettings');
const User = require('../models/User');
const Section = require('../models/Section');
const SectionMember = require('../models/SectionMember');
const ClassSession = require('../models/ClassSession');
const Attendance = require('../models/Attendance');
const AttendanceSession = require('../models/AttendanceSession');
const Student = require('../models/Student');

const DEFAULT_SETTINGS = {
  faceRecognitionThreshold: 0.6,
  livenessCheckEnabled: true,
  sessionTimeoutMinutes: 30,
  maxLoginAttempts: 5,
  // New photo-based recognition settings
  similarityThreshold: 0.6, // 0.45–0.75 recommended
  maxFaceImages: 5,
  // Liveness configuration for attendance verification only
  // none: no liveness anywhere
  // low: blink-only check during attendance verification
  // high: blink + head movement during attendance verification
  livenessMode: 'low',
};

const getSystemSettings = async (req, res, next) => {
  try {
    const docs = await SystemSettings.find();
    const settings = {};
    docs.forEach((d) => { settings[d.key] = d.value; });
    // Merge with defaults
    Object.keys(DEFAULT_SETTINGS).forEach((k) => {
      if (settings[k] === undefined) settings[k] = DEFAULT_SETTINGS[k];
    });
    res.json({ success: true, settings });
  } catch (error) {
    next(error);
  }
};

const updateSystemSettings = async (req, res, next) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object required' });
    }
    for (const [key, value] of Object.entries(settings)) {
      if (!Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key)) continue;
      await SystemSettings.findOneAndUpdate(
        { key },
        { key, value, updatedAt: new Date() },
        { upsert: true, new: true }
      );
    }
    await AuditLog.create({
      actorUserId: req.user._id,
      action: 'UPDATE_SYSTEM_SETTINGS',
      metadata: { keys: Object.keys(settings) },
    });
    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    next(error);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const { action, actorUserId, limit = 200, page = 1 } = req.query;
    const query = {};
    if (action) query.action = action;
    if (actorUserId) query.actorUserId = actorUserId;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [logs, total] = await Promise.all([
      AuditLog.find(query).populate('actorUserId', 'name email').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)).lean(),
      AuditLog.countDocuments(query),
    ]);

    res.json({ success: true, logs, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  } catch (error) {
    next(error);
  }
};

const getAdminUsers = async (req, res, next) => {
  try {
    const users = await User.find({ role: { $in: ['admin', 'superadmin'] } })
      .select('-passwordHash')
      .sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

const purgeAttendance = async (req, res, next) => {
  try {
    const { sectionId, dateFrom, dateTo } = req.body;
    const query = {};
    if (sectionId) query.sectionId = sectionId;
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = dateFrom;
      if (dateTo) query.date.$lte = dateTo;
    }
    const result = await Attendance.deleteMany(query);
    const deleted = result.deletedCount || 0;

    await AuditLog.create({
      actorUserId: req.user._id,
      action: 'PURGE_ATTENDANCE',
      metadata: { sectionId, dateFrom, dateTo, deletedCount: deleted },
    });

    res.json({ success: true, message: `Purged ${deleted} attendance record(s)` });
  } catch (error) {
    next(error);
  }
};

const purgeData = async (req, res, next) => {
  try {
    const { type } = req.body;
    if (!['sessions', 'attendance', 'all'].includes(type)) {
      return res.status(400).json({ error: 'Invalid purge type. Use sessions, attendance, or all' });
    }
    let deleted = 0;
    if (type === 'attendance' || type === 'all') {
      const r = await Attendance.deleteMany({});
      deleted += r.deletedCount || 0;
    }
    if (type === 'sessions' || type === 'all') {
      const r = await AttendanceSession.deleteMany({});
      deleted += r.deletedCount || 0;
    }

    await AuditLog.create({
      actorUserId: req.user._id,
      action: 'PURGE_DATA',
      metadata: { type, deletedCount: deleted },
    });

    res.json({ success: true, message: `Purged data (type: ${type}). Total records removed: ${deleted}` });
  } catch (error) {
    next(error);
  }
};

const deleteSectionSuperadmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const section = await Section.findById(id);
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    await SectionMember.deleteMany({ sectionId: id });
    await ClassSession.deleteMany({ sectionId: id });
    await Attendance.deleteMany({ sectionId: id });
    await AttendanceSession.deleteMany({ sectionId: id });
    await Student.deleteMany({ sectionId: id });
    await Section.findByIdAndDelete(id);

    await AuditLog.create({
      actorUserId: req.user._id,
      action: 'DELETE_SECTION',
      metadata: { sectionId: id, sectionName: section.sectionName },
    });

    res.json({ success: true, message: 'Section and associated data deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSystemSettings,
  updateSystemSettings,
  getAuditLogs,
  getAdminUsers,
  purgeAttendance,
  purgeData,
  deleteSectionSuperadmin,
};
