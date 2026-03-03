const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

systemSettingsSchema.index({ key: 1 });

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
