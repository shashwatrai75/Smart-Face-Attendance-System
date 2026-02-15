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
  endSession,
} = require('../controllers/attendanceController');

router.use(authenticate);
router.use(apiLimiter);

router.post('/start-session', authorize('admin', 'lecturer'), startSession);
router.post('/mark', authorize('admin', 'lecturer'), markAttendance);
router.post('/end-session', authorize('admin', 'lecturer'), endSession);
router.put('/manual-override', authorize('admin', 'lecturer'), manualOverride);
router.get('/history', authorize('admin', 'lecturer', 'viewer'), getAttendanceHistory);
router.get('/sessions', authorize('admin', 'lecturer', 'viewer'), getSessionHistory);
router.get('/session/:sessionId', authorize('admin', 'lecturer', 'viewer'), getSessionDetails);

module.exports = router;

