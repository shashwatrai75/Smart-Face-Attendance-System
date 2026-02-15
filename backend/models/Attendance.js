const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student is required'],
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class is required'],
    },
    lecturerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Lecturer is required'],
    },
    date: {
      type: String,
      required: [true, 'Date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
    },
    time: {
      type: String,
      required: [true, 'Time is required'],
      match: [/^\d{2}:\d{2}:\d{2}$/, 'Time must be in HH:mm:ss format'],
    },
    lastScanTime: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      default: 'present',
    },
    consecutiveLateCount: {
      type: Number,
      default: 0,
    },
    capturedOffline: {
      type: Boolean,
      default: false,
    },
    sessionId: {
      type: String,
      required: [true, 'Session ID is required'],
    },
    remark: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent duplicates
attendanceSchema.index(
  { studentId: 1, classId: 1, date: 1, sessionId: 1 },
  { unique: true }
);

// Indexes for queries
attendanceSchema.index({ classId: 1, date: 1 });
attendanceSchema.index({ studentId: 1 });
attendanceSchema.index({ lecturerId: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);

