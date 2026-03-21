const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Actor user is required'],
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      enum: [
        'LOGIN',
        'CREATE_USER',
        'UPDATE_USER',
        'DELETE_USER',
        'ENROLL_STUDENT',
        'DELETE_STUDENT',
        'MARK_ATTENDANCE',
        'EXPORT_REPORT',
        'DELETE_DATA',
        'CREATE_CLASS',
        'UPDATE_CLASS',
        'DELETE_CLASS',
        'END_SESSION',
        'SMS_ABSENT_BULK',
        'SMS_TEST',
        'SMS_EMPLOYEE_NO_CHECKIN',
        'ENROLL_EMPLOYEE',
        'UPDATE_SYSTEM_SETTINGS',
        'PURGE_ATTENDANCE',
        'PURGE_DATA',
        'DELETE_SECTION',
        'DISABLE_ADMIN',
        'ENABLE_ADMIN',
      ],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Index for queries
auditLogSchema.index({ actorUserId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

