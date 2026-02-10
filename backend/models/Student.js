const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    rollNo: {
      type: String,
      required: [true, 'Roll number is required'],
      trim: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class is required'],
    },
    faceEmbeddingEnc: {
      type: Buffer,
      required: [true, 'Face embedding is required'],
    },
    embeddingVersion: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for rollNo and classId (unique within a class)
studentSchema.index({ rollNo: 1, classId: 1 }, { unique: true });

// Index for classId
studentSchema.index({ classId: 1 });

module.exports = mongoose.model('Student', studentSchema);

