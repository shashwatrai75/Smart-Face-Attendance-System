const mongoose = require('mongoose');

const checkInRecordSchema = new mongoose.Schema(
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
    date: {
      type: String,
      required: [true, 'Date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
    },
    checkInTime: {
      type: Date,
      required: [true, 'Check-in time is required'],
    },
    checkOutTime: {
      type: Date,
      default: null,
    },
    workMinutes: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

checkInRecordSchema.index({ userId: 1, sectionId: 1, date: 1 }, { unique: true });
checkInRecordSchema.index({ sectionId: 1, date: 1 });
checkInRecordSchema.index({ userId: 1 });

module.exports = mongoose.model('CheckInRecord', checkInRecordSchema);
