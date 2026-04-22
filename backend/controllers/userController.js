const bcrypt = require('bcrypt');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Section = require('../models/Section');
const logger = require('../utils/logger');

// Get current user profile (includes assigned department for HR)
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash -failedLoginAttempts -lockUntil');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let department = null;
    if (user.sectionId) {
      const section = await Section.findById(user.sectionId).select('sectionName sectionType').lean();
      if (section) {
        department = { id: section._id, name: section.sectionName, sectionType: section.sectionType };
      }
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        institutionName: user.institutionName,
        status: user.status,
        createdAt: user.createdAt,
        linkedStudentId: user.linkedStudentId || null,
        guardianName: user.guardianName || null,
        guardianPhone: user.guardianPhone || null,
        sectionId: user.sectionId || null,
        department: department || null,
      },
    });
  } catch (error) {
    logger.error(`Get profile error: ${error.message}`);
    next(error);
  }
};

// Change password
const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Get user with password hash
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify old password
    let isMatch;
    try {
      isMatch = await user.comparePassword(oldPassword);
    } catch (error) {
      logger.error(`Password comparison error: ${error.message}`);
      return res.status(500).json({ error: 'Error validating password. Please try again.' });
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Check if new password is different from old password
    const isNewPasswordSame = await user.comparePassword(newPassword);
    if (isNewPasswordSame) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    // Store bcrypt hash directly (same pattern as auth dev-fix / scripts) so login always compares
    // against a single well-formed hash, independent of document save middleware edge cases.
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await User.updateOne({ _id: user._id }, { $set: { passwordHash: hashedPassword } });

    try {
      await AuditLog.create({
        actorUserId: user._id,
        action: 'CHANGE_PASSWORD',
        metadata: { email: user.email },
      });
    } catch (auditErr) {
      logger.warn(`Password changed for ${user.email} but audit log failed: ${auditErr.message}`);
    }

    logger.info(`Password changed for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Password changed successfully. Please login again.',
    });
  } catch (error) {
    logger.error(`Change password error: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getProfile,
  changePassword,
};

