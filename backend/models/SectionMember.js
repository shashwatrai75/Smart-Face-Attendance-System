const mongoose = require('mongoose');

const sectionMemberSchema = new mongoose.Schema(
  {
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'Section is required'],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
  },
  {
    timestamps: true,
  }
);

sectionMemberSchema.index({ sectionId: 1, userId: 1 }, { unique: true });
sectionMemberSchema.index({ sectionId: 1 });
sectionMemberSchema.index({ userId: 1 });

module.exports = mongoose.model('SectionMember', sectionMemberSchema);
