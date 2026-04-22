const mongoose = require('mongoose');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Attendance = require('../models/Attendance');
const Section = require('../models/Section');
const Student = require('../models/Student');
const SectionMember = require('../models/SectionMember');
const logger = require('../utils/logger');
const { hashSecurityAnswer } = require('../utils/securityRecovery');
const { isAllowedSecurityQuestion } = require('../constants/securityQuestions');
const { dedupeUsersByEmailForResponse } = require('../utils/userDedupe');
const { todayDate } = require('../utils/timeHelpers');
const {
  isSmsFullyConfigured,
  sendSmsTwilio,
  buildAbsentGuardianMessage,
  buildLinkedStudentAccountGuardianMessage,
} = require('../utils/sms');

const createUser = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      address,
      city,
      state,
      zipCode,
      country,
      dateOfBirth,
      gender,
      role,
      institutionName,
      image,
      linkedStudentId,
      sectionId,
      guardianName,
      guardianPhone,
      securityQuestion1,
      securityQuestion2,
      securityAnswer1,
      securityAnswer2,
    } = req.body;

    // Role restrictions: Only superadmin can create admins, superadmins, or HR
    if (role && (role === 'admin' || role === 'superadmin' || role === 'hr') && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only Superadmins can create Office Admin, Superadmin, or Supervisor users' });
    }

    const institutionTrim = typeof institutionName === 'string' ? institutionName.trim() : '';
    if (!institutionTrim) {
      return res.status(400).json({ error: 'Institution name is required' });
    }

    const sq1 = typeof securityQuestion1 === 'string' ? securityQuestion1.trim() : '';
    const sq2 = typeof securityQuestion2 === 'string' ? securityQuestion2.trim() : '';
    const sa1 = typeof securityAnswer1 === 'string' ? securityAnswer1 : '';
    const sa2 = typeof securityAnswer2 === 'string' ? securityAnswer2 : '';
    const sa1t = sa1.trim();
    const sa2t = sa2.trim();
    const anySecurity = sq1 || sq2 || sa1t || sa2t;
    const allSecurity = sq1 && sq2 && sa1t && sa2t;
    if (anySecurity && !allSecurity) {
      return res.status(400).json({
        error: 'Fill both security questions (from the list) and both answers, or leave recovery unset.',
      });
    }
    let securityPayload = null;
    if (allSecurity) {
      if (!isAllowedSecurityQuestion(sq1) || !isAllowedSecurityQuestion(sq2)) {
        return res.status(400).json({ error: 'Each security question must be chosen from the allowed list.' });
      }
      if (sq1 === sq2) {
        return res.status(400).json({ error: 'Security questions must be different from each other.' });
      }
      if (sa1t.length < 2 || sa2t.length < 2) {
        return res.status(400).json({
          error: 'Each security answer must be at least 2 characters.',
        });
      }
      securityPayload = {
        securityQuestion1: sq1,
        securityQuestion2: sq2,
        securityAnswer1Hash: await hashSecurityAnswer(sa1),
        securityAnswer2Hash: await hashSecurityAnswer(sa2),
      };
    }

    const userData = {
      name,
      email: email.toLowerCase(),
      passwordHash: password,
      phone,
      address,
      city,
      state,
      zipCode,
      country,
      dateOfBirth: dateOfBirth || undefined,
      gender: gender || '',
      role: role || 'member',
      institutionName: institutionTrim,
      image,
      status: 'active',
    };
    if (linkedStudentId) {
      userData.linkedStudentId = linkedStudentId;
    }
    if (sectionId) {
      userData.sectionId = sectionId;
    }
    if (guardianName !== undefined) userData.guardianName = guardianName || '';
    if (guardianPhone !== undefined) userData.guardianPhone = guardianPhone || '';
    if (securityPayload) {
      Object.assign(userData, securityPayload);
    }

    const user = await User.create(userData);

    await AuditLog.create({
      actorUserId: req.user._id,
      action: 'CREATE_USER',
      metadata: { createdUserId: user._id, email: user.email, role: user.role },
    });

    if (linkedStudentId && mongoose.Types.ObjectId.isValid(String(linkedStudentId))) {
      try {
        const stu = await Student.findById(linkedStudentId).populate('sectionId', 'sectionName');
        if (stu?.guardianPhone && isSmsFullyConfigured()) {
          const sectionName =
            stu.sectionId && typeof stu.sectionId === 'object' && stu.sectionId.sectionName
              ? stu.sectionId.sectionName
              : (await Section.findById(stu.sectionId).select('sectionName'))?.sectionName || 'class';
          const body = buildLinkedStudentAccountGuardianMessage(user, stu, sectionName);
          const result = await sendSmsTwilio({ to: stu.guardianPhone, body });
          if (result?.skipped) logger.warn(`Linked-student account SMS skipped (${result.reason})`);
        }
      } catch (err) {
        logger.warn(`Linked-student account SMS error: ${err.message}`);
      }
    }

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        institutionName: user.institutionName,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    let users = await User.find().select('-passwordHash').sort({ createdAt: -1 });

    // Admin: exclude admin and superadmin; Superadmin: no filtering
    if (req.user.role === 'admin') {
      users = users.filter((u) => u.role !== 'admin' && u.role !== 'superadmin');
    }

    users = dedupeUsersByEmailForResponse(users);

    res.json({
      success: true,
      users,
    });
  } catch (error) {
    next(error);
  }
};

const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'disabled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const userToUpdate = await User.findById(id);
    if (!userToUpdate) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Role restrictions: Admins cannot update other admins or superadmins
    if ((userToUpdate.role === 'admin' || userToUpdate.role === 'superadmin') && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied. You cannot modify Office Admin or Superadmin status.' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    await AuditLog.create({
      actorUserId: req.user._id,
      action: 'UPDATE_USER',
      metadata: { userId: id, status },
    });

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      country,
      dateOfBirth,
      gender,
      role,
      institutionName,
      status,
      guardianName,
      guardianPhone,
      securityQuestion1,
      securityQuestion2,
      securityAnswer1,
      securityAnswer2,
    } = req.body;

    const userToUpdate = await User.findById(id);
    if (!userToUpdate) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Role restrictions: Admins cannot modify admin or superadmin accounts
    if ((userToUpdate.role === 'admin' || userToUpdate.role === 'superadmin') && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied. You cannot modify Office Admin or Superadmin accounts.' });
    }

    // Only superadmin can change admin/superadmin roles
    if (role && (role === 'admin' || role === 'superadmin') && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only Superadmins can assign Office Admin or Superadmin roles' });
    }

    // Check email uniqueness if changing
    if (email && email.toLowerCase() !== userToUpdate.email) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (email !== undefined) updateFields.email = email.toLowerCase();
    if (phone !== undefined) updateFields.phone = phone;
    if (address !== undefined) updateFields.address = address;
    if (city !== undefined) updateFields.city = city;
    if (state !== undefined) updateFields.state = state;
    if (zipCode !== undefined) updateFields.zipCode = zipCode;
    if (country !== undefined) updateFields.country = country;
    if (dateOfBirth !== undefined) updateFields.dateOfBirth = dateOfBirth || undefined;
    if (gender !== undefined) updateFields.gender = gender || '';
    if (role !== undefined) updateFields.role = role;
    if (institutionName !== undefined) updateFields.institutionName = institutionName;
    if (status !== undefined && ['active', 'disabled'].includes(status)) updateFields.status = status;
    if (guardianName !== undefined) updateFields.guardianName = guardianName || '';
    if (guardianPhone !== undefined) updateFields.guardianPhone = guardianPhone || '';

    const allSecurityProvided =
      typeof securityQuestion1 === 'string' &&
      typeof securityQuestion2 === 'string' &&
      typeof securityAnswer1 === 'string' &&
      typeof securityAnswer2 === 'string';
    if (allSecurityProvided) {
      const sq1 = securityQuestion1.trim();
      const sq2 = securityQuestion2.trim();
      const sa1 = securityAnswer1;
      const sa2 = securityAnswer2;
      if (!isAllowedSecurityQuestion(sq1) || !isAllowedSecurityQuestion(sq2)) {
        return res.status(400).json({ error: 'Each security question must be chosen from the allowed list.' });
      }
      if (!sa1.trim() || !sa2.trim() || sa1.trim().length < 2 || sa2.trim().length < 2) {
        return res.status(400).json({
          error: 'Security answers must be at least 2 characters each.',
        });
      }
      if (sq1 === sq2) {
        return res.status(400).json({ error: 'Security questions must be different from each other.' });
      }
      updateFields.securityQuestion1 = sq1;
      updateFields.securityQuestion2 = sq2;
      updateFields.securityAnswer1Hash = await hashSecurityAnswer(sa1);
      updateFields.securityAnswer2Hash = await hashSecurityAnswer(sa2);
    }

    const user = await User.findByIdAndUpdate(id, updateFields, {
      new: true,
      runValidators: true,
    }).select('-passwordHash');

    await AuditLog.create({
      actorUserId: req.user._id,
      action: 'UPDATE_USER',
      metadata: { userId: id, updatedFields: Object.keys(updateFields) },
    });

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const userToDelete = await User.findById(id);
    if (!userToDelete) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Role restrictions: Admins cannot delete other admins or superadmins
    if ((userToDelete.role === 'admin' || userToDelete.role === 'superadmin') && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied. You cannot delete Office Admin or Superadmin accounts.' });
    }

    await User.findByIdAndDelete(id);

    await AuditLog.create({
      actorUserId: req.user._id,
      action: 'DELETE_USER',
      metadata: { deletedUserId: id, email: userToDelete.email },
    });

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

const getStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalSections = await Section.countDocuments();
    const totalStudents = await Student.countDocuments();
    const totalAttendance = await Attendance.countDocuments();

    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = await Attendance.countDocuments({ date: today });

    const activeMembers = await User.countDocuments({ role: 'member', status: 'active' });

    // Advanced metrics
    const verifiedUsers = await User.countDocuments({ verified: true });
    const usersWithRecentLogin = await User.countDocuments({
      lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
    });
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeMembers,
        totalSections,
        totalStudents,
        totalAttendance,
        todayAttendance,
        verifiedUsers,
        usersWithRecentLogin,
        newUsersThisMonth,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateUserNotes = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { notes },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await AuditLog.create({
      actorUserId: req.user._id,
      action: 'UPDATE_USER',
      metadata: { userId: id, field: 'notes' },
    });

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

const updateUserTags = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { tags: Array.isArray(tags) ? tags : [] },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await AuditLog.create({
      actorUserId: req.user._id,
      action: 'UPDATE_USER',
      metadata: { userId: id, field: 'tags' },
    });

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

const verifyUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      { verified: true, verifiedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await AuditLog.create({
      actorUserId: req.user._id,
      action: 'UPDATE_USER',
      metadata: { userId: id, field: 'verified' },
    });

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

const getUserActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const AuditLog = require('../models/AuditLog');

    const activities = await AuditLog.find({ actorUserId: id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('actorUserId', 'name email');

    res.json({
      success: true,
      activities,
    });
  } catch (error) {
    next(error);
  }
};

const enrollEmployee = async (req, res, next) => {
  try {
    const {
      fullName,
      employeeId,
      email,
      phone,
      dateOfBirth,
      gender,
      jobTitle,
      address,
      emergencyContactName,
      emergencyContactPhone,
      joinDate,
      shiftStart,
      shiftEnd,
      employmentStatus,
      departmentId,
    } = req.body;

    if (!fullName || !email || !departmentId) {
      return res.status(400).json({
        error: 'Missing required fields: fullName, email, and department are required',
      });
    }

    const section = await Section.findById(departmentId);
    if (!section) return res.status(404).json({ error: 'Department not found' });
    if (section.sectionType !== 'department') {
      return res.status(400).json({ error: 'Department must be a department-type section' });
    }

    // HR may only enroll employees into their assigned department
    if (req.user.role === 'hr' && req.user.sectionId && departmentId !== req.user.sectionId.toString()) {
      return res.status(403).json({
        error: 'Access denied. You can only enroll employees into your assigned department.',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Generate temporary password for new employee
    const tempPassword = `Temp${employeeId || Date.now()}@123`;

    const userData = {
      name: fullName.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: tempPassword,
      phone: phone?.trim() || '',
      address: address?.trim() || '',
      dateOfBirth: dateOfBirth || undefined,
      gender: gender || '',
      role: 'member',
      status: employmentStatus === 'active' || !employmentStatus ? 'active' : 'disabled',
      employeeId: employeeId?.trim() || '',
      jobTitle: jobTitle?.trim() || '',
      emergencyContactName: emergencyContactName?.trim() || '',
      emergencyContactPhone: emergencyContactPhone?.trim() || '',
      joinDate: joinDate || undefined,
      shiftStart: shiftStart?.trim() || '',
      shiftEnd: shiftEnd?.trim() || '',
      employmentStatus: employmentStatus || 'active',
    };

    const user = await User.create(userData);

    await SectionMember.create({ sectionId: departmentId, userId: user._id });

    await AuditLog.create({
      actorUserId: req.user._id,
      action: 'ENROLL_EMPLOYEE',
      metadata: { userId: user._id, email: user.email, departmentId },
    });

    res.status(201).json({
      success: true,
      message: 'Employee enrolled successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId,
        departmentId,
      },
      tempPassword,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    next(error);
  }
};

const uploadUserImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { image } = req.body; // Expecting Base64 from frontend if not using Multer

    if (!image) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { image },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await AuditLog.create({
      actorUserId: req.user._id,
      action: 'UPDATE_USER',
      metadata: { userId: id, field: 'image' },
    });

    res.json({
      success: true,
      image: user.image,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /admin/sms/test  body: { to: string, message?: string }
 * Sends a single SMS (Twilio). For verifying configuration.
 */
const sendTestSms = async (req, res, next) => {
  try {
    if (!isSmsFullyConfigured()) {
      return res.status(400).json({
        error:
          'Messaging not configured. For SMS: TWILIO_FROM_NUMBER. For WhatsApp: TWILIO_MESSAGING_CHANNEL=whatsapp and TWILIO_WHATSAPP_FROM. Plus SMS_ENABLED=true, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN.',
      });
    }
    const { to, message } = req.body;
    const phone = typeof to === 'string' ? to.trim() : '';
    if (!phone) {
      return res.status(400).json({ error: 'to (phone number) is required' });
    }
    const body =
      (typeof message === 'string' && message.trim().slice(0, 320)) ||
      'Smart Face Attendance: test SMS. If you received this, Twilio is working.';
    await sendSmsTwilio({ to: phone, body });
    await AuditLog.create({
      actorUserId: req.user._id,
      action: 'SMS_TEST',
      metadata: { ok: true },
    });
    res.json({ success: true, message: 'SMS sent' });
  } catch (err) {
    logger.warn(`sendTestSms: ${err.message}`);
    res.status(502).json({ error: err.message || 'Twilio request failed' });
  }
};

/**
 * POST /admin/sms/absent-today
 * Query: date=YYYY-MM-DD (optional, default today in TZ), sectionId (optional)
 * Sends one SMS per student (deduped) with absent status to guardian phone.
 */
const notifyAbsentTodaySMS = async (req, res, next) => {
  try {
    if (!isSmsFullyConfigured()) {
      return res.status(400).json({
        error:
          'Messaging not configured. Set Twilio vars (SMS or WhatsApp — see TWILIO_MESSAGING_CHANNEL).',
      });
    }

    const { date, sectionId } = req.query;
    const targetDate = date && /^\d{4}-\d{2}-\d{2}$/.test(String(date)) ? String(date) : todayDate();

    const filter = { date: targetDate, status: 'absent' };
    if (sectionId && mongoose.Types.ObjectId.isValid(String(sectionId))) {
      filter.sectionId = sectionId;
    }

    const records = await Attendance.find(filter).populate('studentId').lean();

    const seen = new Map();
    for (const r of records) {
      const st = r.studentId;
      if (!st || !st._id) continue;
      const id = st._id.toString();
      if (!seen.has(id)) seen.set(id, { student: st, sectionId: r.sectionId });
    }

    const entries = Array.from(seen.values());
    const sectionObjectIds = [
      ...new Set(entries.map((e) => e.sectionId).filter(Boolean).map((id) => id.toString())),
    ].map((id) => new mongoose.Types.ObjectId(id));

    const sections = await Section.find({ _id: { $in: sectionObjectIds } }).select('sectionName').lean();
    const sectionNameById = Object.fromEntries(sections.map((s) => [s._id.toString(), s.sectionName]));

    const smsMax = parseInt(process.env.SMS_MAX_PER_RUN || process.env.SMS_MAX_PER_SESSION || '100', 10);
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const { student, sectionId: sid } of entries.slice(0, smsMax)) {
      if (!student.guardianPhone) {
        skipped++;
        continue;
      }
      const sectionName = sectionNameById[sid?.toString()] || 'class';
      const body = buildAbsentGuardianMessage(student, sectionName, targetDate);
      try {
        const result = await sendSmsTwilio({ to: student.guardianPhone, body });
        if (result?.skipped) skipped++;
        else sent++;
      } catch (err) {
        failed++;
        logger.warn(`notifyAbsentTodaySMS failed for ${student.guardianPhone}: ${err.message}`);
      }
    }

    await AuditLog.create({
      actorUserId: req.user._id,
      action: 'SMS_ABSENT_BULK',
      metadata: { date: targetDate, sectionId: sectionId || null, sent, failed, skipped },
    });

    res.json({
      success: true,
      date: targetDate,
      uniqueAbsentStudents: entries.length,
      sent,
      failed,
      skipped,
      cappedAt: smsMax,
      truncated: entries.length > smsMax,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createUser,
  getUsers,
  updateUserStatus,
  updateUser,
  deleteUser,
  getStats,
  updateUserNotes,
  updateUserTags,
  verifyUser,
  getUserActivity,
  uploadUserImage,
  enrollEmployee,
  notifyAbsentTodaySMS,
  sendTestSms,
};

