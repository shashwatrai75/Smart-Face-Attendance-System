const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Section = require('../models/Section');
const config = require('../config/env');
const logger = require('../utils/logger');
const { compareSecurityAnswer } = require('../utils/securityRecovery');

const generateToken = (userId) => {
  return jwt.sign({ userId }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRE,
  });
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if MongoDB is connected
    if (require('mongoose').connection.readyState !== 1) {
      return res.status(503).json({ 
        success: false,
        error: 'Database connection not available. Please check MongoDB connection and IP whitelist.' 
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.isLocked) {
      // Auto-unlock in development mode
      if (process.env.NODE_ENV === 'development') {
        await user.resetLoginAttempts();
      } else {
        return res.status(423).json({
          error: 'Account locked due to too many failed attempts. Please try again later.',
        });
      }
    }

    // Check if user has a password hash
    if (!user.passwordHash) {
      logger.error(`User ${user.email} has no password hash`);
      
      // In development mode, try to auto-fix by setting the provided password
      if (process.env.NODE_ENV === 'development' && config.ALLOW_SEED) {
        logger.warn(`Auto-fixing user ${user.email} in development mode`);
        
        // Hash the password and update directly using updateOne to bypass pre-save hook
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Use updateOne to bypass the pre-save hook (which would double-hash)
        await User.updateOne(
          { _id: user._id },
          { $set: { passwordHash: hashedPassword } }
        );
        
        // Refresh the user object from database to get the updated passwordHash
        const refreshedUser = await User.findById(user._id);
        if (refreshedUser) {
          Object.assign(user, refreshedUser.toObject());
        } else {
          user.passwordHash = hashedPassword;
        }
        logger.info(`User ${user.email} password has been configured`);
        
        // Continue with normal login flow
        // The password will be validated below
      } else {
        return res.status(500).json({ 
          success: false,
          error: 'User account is not properly configured. Please contact administrator or run: node scripts/fixUserPassword.js <email> <password>' 
        });
      }
    }

    let isMatch = false;
    try {
      // Try using the model method first
      isMatch = await user.comparePassword(password);
      logger.info(`Password comparison for ${user.email}: ${isMatch ? 'MATCH' : 'NO MATCH'}`);
    } catch (error) {
      logger.error(`Password comparison error for ${user.email}: ${error.message}`);
      
      // If password hash is missing or invalid, try to fix it in development
      if (process.env.NODE_ENV === 'development' && config.ALLOW_SEED && error.message.includes('missing')) {
        logger.warn(`Attempting to fix password hash for ${user.email}`);
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(password, 12);
        await User.updateOne(
          { _id: user._id },
          { $set: { passwordHash: hashedPassword } }
        );
        
        // Refresh user object
        const refreshedUser = await User.findById(user._id);
        if (refreshedUser) {
          Object.assign(user, refreshedUser.toObject());
        }
        
        // Retry password comparison
        isMatch = await user.comparePassword(password);
        logger.info(`Password comparison after fix for ${user.email}: ${isMatch ? 'MATCH' : 'NO MATCH'}`);
      } else {
        // Fallback: try direct bcrypt comparison if model method fails
        if (user.passwordHash) {
          logger.warn(`Falling back to direct bcrypt comparison for ${user.email}`);
          const bcrypt = require('bcrypt');
          isMatch = await bcrypt.compare(password, user.passwordHash);
          logger.info(`Direct bcrypt comparison for ${user.email}: ${isMatch ? 'MATCH' : 'NO MATCH'}`);
        } else {
          return res.status(500).json({ 
            success: false,
            error: 'Error validating password. Please try again.' 
          });
        }
      }
    }

    if (!isMatch) {
      await user.incLoginAttempts();
      logger.warn(`Failed login attempt for ${user.email}. Attempts: ${user.failedLoginAttempts + 1}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is disabled' });
    }

    await user.resetLoginAttempts();

    // Update last login and login count
    await User.findByIdAndUpdate(user._id, {
      $set: { lastLogin: new Date() },
      $inc: { loginCount: 1 },
    });

    const token = generateToken(user._id);

    // Include assigned department for HR (and others with sectionId)
    let department = null;
    if (user.sectionId) {
      const section = await Section.findById(user.sectionId).select('sectionName sectionType').lean();
      if (section) {
        department = { id: section._id, name: section.sectionName, sectionType: section.sectionType };
      }
    }

    // Log login
    await AuditLog.create({
      actorUserId: user._id,
      action: 'LOGIN',
      metadata: { email: user.email },
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        institutionName: user.institutionName,
        linkedStudentId: user.linkedStudentId || null,
        sectionId: user.sectionId || null,
        department: department || null,
      },
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    next(error);
  }
};

const recoveryQuestions = async (req, res, next) => {
  try {
    const { email } = req.body || {};
    const normalized = typeof email === 'string' ? email.toLowerCase().trim() : '';

    if (!normalized || !/^\S+@\S+\.\S+$/.test(normalized)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    if (require('mongoose').connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database connection not available. Please try again later.',
      });
    }

    await new Promise((r) => setTimeout(r, 200 + Math.floor(Math.random() * 200)));

    const user = await User.findOne({ email: normalized }).select(
      '+securityAnswer1Hash +securityAnswer2Hash securityQuestion1 securityQuestion2 status'
    );

    const hasRecovery =
      user &&
      user.status === 'active' &&
      user.securityQuestion1 &&
      user.securityQuestion2 &&
      user.securityAnswer1Hash &&
      user.securityAnswer2Hash;

    if (!hasRecovery) {
      return res.json({
        success: true,
        questions: null,
        message:
          'No recovery questions are available for this email. Confirm the address or ask an administrator to set up your account.',
      });
    }

    return res.json({
      success: true,
      questions: [
        { id: 1, text: user.securityQuestion1 },
        { id: 2, text: user.securityQuestion2 },
      ],
    });
  } catch (error) {
    logger.error(`Recovery questions error: ${error.message}`);
    next(error);
  }
};

const recoveryResetPassword = async (req, res, next) => {
  try {
    const { email, questionId, answer, newPassword } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';

    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    const qid = Number(questionId);
    if (qid !== 1 && qid !== 2) {
      return res.status(400).json({ error: 'Choose question 1 or 2' });
    }

    if (!answer || typeof answer !== 'string') {
      return res.status(400).json({ error: 'Answer is required' });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    if (require('mongoose').connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database connection not available. Please try again later.',
      });
    }

    await new Promise((r) => setTimeout(r, 200 + Math.floor(Math.random() * 200)));

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+securityAnswer1Hash +securityAnswer2Hash status'
    );

    const failMsg =
      'Could not reset password. Check your email, which question you selected, your answer, and try again.';

    if (!user || user.status !== 'active') {
      return res.status(400).json({ error: failMsg });
    }

    const hash = qid === 1 ? user.securityAnswer1Hash : user.securityAnswer2Hash;
    const ok = await compareSecurityAnswer(answer, hash);
    if (!ok) {
      return res.status(400).json({ error: failMsg });
    }

    user.passwordHash = newPassword;
    await user.save();

    await User.updateOne(
      { _id: user._id },
      {
        $set: { failedLoginAttempts: 0 },
        $unset: { lockUntil: 1 },
      }
    );

    await AuditLog.create({
      actorUserId: user._id,
      action: 'PASSWORD_RESET',
      metadata: { email: user.email, method: 'security_questions' },
    });

    return res.json({ success: true, message: 'Your password has been updated. You can sign in now.' });
  } catch (error) {
    logger.error(`Recovery reset password error: ${error.message}`);
    next(error);
  }
};

const seedAdmin = async (req, res, next) => {
  try {
    if (!config.ALLOW_SEED) {
      return res.status(403).json({ error: 'Seeding is disabled' });
    }

    const adminExists = await User.findOne({ role: 'admin' });

    if (adminExists) {
      return res.status(400).json({ error: 'Admin user already exists' });
    }

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const admin = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash: password, // Will be hashed by pre-save hook
      role: 'admin',
      status: 'active',
    });

    logger.info(`Admin user created: ${admin.email}`);

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    logger.error(`Seed admin error: ${error.message}`);
    next(error);
  }
};

module.exports = {
  login,
  recoveryQuestions,
  recoveryResetPassword,
  seedAdmin,
};

