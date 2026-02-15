const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const config = require('../config/env');
const logger = require('../utils/logger');

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

    const user = await User.findOne({ email: email.toLowerCase() });

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
      },
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
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
  seedAdmin,
};

