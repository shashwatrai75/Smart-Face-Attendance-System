const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
    },
    role: {
      type: String,
      enum: ['superadmin', 'admin', 'member', 'hr'],
      default: 'member',
    },
    status: {
      type: String,
      enum: ['active', 'disabled'],
      default: 'active',
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    zipCode: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', ''],
      default: '',
    },
    institutionName: {
      type: String,
      trim: true,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    lastLogin: {
      type: Date,
    },
    loginCount: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    verified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
    },
    image: {
      type: String, // Base64 or URL
    },
    // Optional: link a login User to a Student record (e.g. portal); most students exist without a User.
    linkedStudentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
    },
    guardianName: {
      type: String,
      trim: true,
    },
    guardianPhone: {
      type: String,
      trim: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      default: null,
    },
    // Face recognition (photo-based) - optional until enrollment
    faceImages: [
      {
        type: String, // URL path to stored face image
        trim: true,
      },
    ],
    defaultFaceImage: {
      type: String, // Primary face image URL
      trim: true,
    },
    faceCreatedAt: {
      type: Date,
    },
    // Employee-specific fields
    employeeId: { type: String, trim: true },
    jobTitle: { type: String, trim: true },
    emergencyContactName: { type: String, trim: true },
    emergencyContactPhone: { type: String, trim: true },
    joinDate: { type: Date },
    shiftStart: { type: String, trim: true }, // HH:mm 24hr
    shiftEnd: { type: String, trim: true }, // HH:mm 24hr
    employmentStatus: {
      type: String,
      enum: ['active', 'on_leave', 'resigned', ''],
      default: 'active',
    },
    securityQuestion1: {
      type: String,
      trim: true,
    },
    securityQuestion2: {
      type: String,
      trim: true,
    },
    securityAnswer1Hash: {
      type: String,
      select: false,
    },
    securityAnswer2Hash: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for checking if account is locked
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!candidatePassword) {
    throw new Error('Password is required');
  }
  if (!this.passwordHash) {
    throw new Error('User password hash is missing. User may need to reset password.');
  }
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Method to handle failed login
userSchema.methods.incLoginAttempts = function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { failedLoginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }
  const updates = { $inc: { failedLoginAttempts: 1 } };
  if (this.failedLoginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 15 * 60 * 1000 }; // 15 minutes
  }
  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { failedLoginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

module.exports = mongoose.model('User', userSchema);

