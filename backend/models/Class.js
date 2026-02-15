const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    className: {
      type: String,
      required: [true, 'Class name is required'],
      trim: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    lecturerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Lecturer is required'],
    },
    schedule: {
      type: String,
      trim: true,
    },
    section: {
      type: String,
      trim: true,
    },
    room: {
      type: String,
      trim: true,
    },
    semester: {
      type: String,
      trim: true,
    },
    academicYear: {
      type: String,
      trim: true,
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

// Index for lecturer
classSchema.index({ lecturerId: 1 });

module.exports = mongoose.model('Class', classSchema);

