const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const { apiLimiter } = require('../middleware/rateLimit');
const {
  startSession,
  markAttendance,
  heartbeatSession,
  manualOverride,
  getAttendanceHistory,
  getSessionHistory,
  getSessionDetails,
  getCalendarAttendance,
  endSession,
} = require('../controllers/attendanceController');

router.use(authenticate);
router.use(apiLimiter);

router.post('/start-session', authorize('superadmin', 'admin', 'member'), startSession);
router.post('/mark', authorize('superadmin', 'admin', 'member'), markAttendance);
router.post('/heartbeat', authorize('superadmin', 'admin', 'member'), heartbeatSession);
router.post('/end-session', authorize('superadmin', 'admin', 'member'), endSession);
router.put('/manual-override', authorize('superadmin', 'admin', 'member'), manualOverride);
router.get('/history', authorize('superadmin', 'admin', 'member'), getAttendanceHistory);
router.get('/sessions', authorize('superadmin', 'admin', 'member'), getSessionHistory);
router.get('/session/:sessionId', authorize('superadmin', 'admin', 'member'), getSessionDetails);
router.get('/calendar', authorize('superadmin', 'admin', 'member'), getCalendarAttendance);

module.exports = router;

