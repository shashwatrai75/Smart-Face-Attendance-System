const mongoose = require('mongoose');

const departmentFaceEnrollmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'Section is required'],
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

departmentFaceEnrollmentSchema.index({ userId: 1, sectionId: 1 }, { unique: true });
departmentFaceEnrollmentSchema.index({ sectionId: 1 });

module.exports = mongoose.model('DepartmentFaceEnrollment', departmentFaceEnrollmentSchema);
