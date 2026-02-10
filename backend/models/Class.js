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
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Teacher is required'],
    },
    schedule: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for teacher
classSchema.index({ teacherId: 1 });

module.exports = mongoose.model('Class', classSchema);

