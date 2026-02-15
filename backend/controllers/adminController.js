const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Attendance = require('../models/Attendance');
const Class = require('../models/Class');
const Student = require('../models/Student');
const logger = require('../utils/logger');

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
    } = req.body;

    // Role restrictions: Only superadmin can create admins or superadmins
    if (role && (role === 'admin' || role === 'superadmin') && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only Superadmins can create Admin or Superadmin users' });
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
      role: role || 'lecturer',
      institutionName,
      image,
      status: 'active',
    };
    if (linkedStudentId && role === 'viewer') {
      userData.linkedStudentId = linkedStudentId;
    }
    const user = await User.create(userData);

    await AuditLog.create({
      actorUserId: req.user._id,
      action: 'CREATE_USER',
      metadata: { createdUserId: user._id, email: user.email, role: user.role },
    });

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
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });

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
      return res.status(403).json({ error: 'Access denied. You cannot modify Admin or Superadmin status.' });
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
      return res.status(403).json({ error: 'Access denied. You cannot delete Admin or Superadmin accounts.' });
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
    const totalClasses = await Class.countDocuments();
    const totalStudents = await Student.countDocuments();
    const totalAttendance = await Attendance.countDocuments();

    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = await Attendance.countDocuments({ date: today });

    const activeLecturers = await User.countDocuments({ role: 'lecturer', status: 'active' });

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
        activeLecturers,
        totalClasses,
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

module.exports = {
  createUser,
  getUsers,
  updateUserStatus,
  deleteUser,
  getStats,
  updateUserNotes,
  updateUserTags,
  verifyUser,
  getUserActivity,
  uploadUserImage,
};

