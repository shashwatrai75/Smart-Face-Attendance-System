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
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      unique: true,
    },
    guardianName: {
      type: String,
      required: [true, 'Guardian name is required'],
      trim: true,
    },
    guardianPhone: {
      type: String,
      required: [true, 'Guardian phone is required'],
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    gender: {
      type: String,
      required: [true, 'Gender is required'],
      enum: ['male', 'female', 'other'],
      trim: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'Section is required'],
    },
    // Photo-based face recognition fields (optional until enrollment)
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
  },
  {
    timestamps: true,
  }
);

studentSchema.index({ rollNo: 1, sectionId: 1 }, { unique: true });
studentSchema.index({ sectionId: 1 });

module.exports = mongoose.model('Student', studentSchema);
