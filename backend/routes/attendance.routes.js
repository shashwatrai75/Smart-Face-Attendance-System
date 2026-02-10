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

router.post('/start-session', authorize('admin', 'teacher'), startSession);
router.post('/mark', authorize('admin', 'teacher'), markAttendance);
router.post('/end-session', authorize('admin', 'teacher'), endSession);
router.put('/manual-override', authorize('admin', 'teacher'), manualOverride);
router.get('/history', authorize('admin', 'teacher', 'viewer'), getAttendanceHistory);
router.get('/sessions', authorize('admin', 'teacher', 'viewer'), getSessionHistory);
router.get('/session/:sessionId', authorize('admin', 'teacher', 'viewer'), getSessionDetails);

module.exports = router;

