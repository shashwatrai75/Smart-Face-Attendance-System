const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const { apiLimiter } = require('../middleware/rateLimit');
const {
  startSession,
  markAttendance,
  manualOverride,
  getAttendanceHistory,
  getSessionHistory,
  getSessionDetails,
  getCalendarAttendance,
  endSession,
} = require('../controllers/attendanceController');

router.use(authenticate);
router.use(apiLimiter);

router.post('/start-session', authorize('superadmin', 'admin', 'lecturer'), startSession);
router.post('/mark', authorize('superadmin', 'admin', 'lecturer'), markAttendance);
router.post('/end-session', authorize('superadmin', 'admin', 'lecturer'), endSession);
router.put('/manual-override', authorize('superadmin', 'admin', 'lecturer'), manualOverride);
router.get('/history', authorize('superadmin', 'admin', 'lecturer', 'viewer'), getAttendanceHistory);
router.get('/sessions', authorize('superadmin', 'admin', 'lecturer', 'viewer'), getSessionHistory);
router.get('/session/:sessionId', authorize('superadmin', 'admin', 'lecturer', 'viewer'), getSessionDetails);
router.get('/calendar', authorize('superadmin', 'admin', 'lecturer', 'viewer'), getCalendarAttendance);

module.exports = router;

