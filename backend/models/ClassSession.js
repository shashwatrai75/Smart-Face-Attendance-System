const mongoose = require('mongoose');

const timeRegex = /^([01]?\d|2[0-3]):[0-5]\d$/; // HH:mm or H:mm

const classSessionSchema = new mongoose.Schema(
  {
    sessionName: {
      type: String,
      required: [true, 'Session name is required'],
      trim: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'Section is required'],
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Teacher is required'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [timeRegex, 'Time must be HH:mm'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [timeRegex, 'Time must be HH:mm'],
    },
  },
  {
    timestamps: true,
  }
);

classSessionSchema.index({ sectionId: 1 });
classSessionSchema.index({ teacherId: 1 });

module.exports = mongoose.model('ClassSession', classSessionSchema);
