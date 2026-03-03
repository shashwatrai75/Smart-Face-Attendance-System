const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const authorizeSuperadmin = require('../middleware/superadminMiddleware');
const { apiLimiter } = require('../middleware/rateLimit');
const {
  getSystemSettings,
  updateSystemSettings,
  getAuditLogs,
  getAdminUsers,
  purgeAttendance,
  purgeData,
  deleteSectionSuperadmin,
} = require('../controllers/superadminController');

router.use(authenticate);
router.use(authorizeSuperadmin);
router.use(apiLimiter);

// System Settings
router.get('/settings', getSystemSettings);
router.put('/settings', updateSystemSettings);

// Audit Logs
router.get('/audit-logs', getAuditLogs);

// Admin Management
router.get('/admins', getAdminUsers);

// Danger Zone
router.post('/purge-attendance', purgeAttendance);
router.post('/purge-data', purgeData);
router.delete('/sections/:id', deleteSectionSuperadmin);

module.exports = router;
