const mongoose = require('mongoose');

const timeRegex = /^([01]?\d|2[0-3]):[0-5]\d$/; // HH:mm or H:mm
const dateRegex = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD

const sectionSchema = new mongoose.Schema(
  {
    sectionName: {
      type: String,
      required: [true, 'Section name is required'],
      trim: true,
    },
    sectionType: {
      type: String,
      enum: ['class', 'department'],
      required: [true, 'Section type is required'],
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      default: null,
    },
    // Class section: duration and class time window
    startDate: {
      type: String,
      trim: true,
      match: [dateRegex, 'Date must be YYYY-MM-DD'],
    },
    endDate: {
      type: String,
      trim: true,
      match: [dateRegex, 'Date must be YYYY-MM-DD'],
    },
    classStartTime: {
      type: String,
      trim: true,
      match: [timeRegex, 'Time must be HH:mm'],
    },
    classEndTime: {
      type: String,
      trim: true,
      match: [timeRegex, 'Time must be HH:mm'],
    },
    // Department section: shift window
    shiftStartTime: {
      type: String,
      trim: true,
      match: [timeRegex, 'Time must be HH:mm'],
    },
    shiftEndTime: {
      type: String,
      trim: true,
      match: [timeRegex, 'Time must be HH:mm'],
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

sectionSchema.index({ sectionType: 1 });
sectionSchema.index({ classId: 1 });

module.exports = mongoose.model('Section', sectionSchema);
