const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const { apiLimiter } = require('../middleware/rateLimit');
const {
  recordCheckIn,
  getCheckInHistory,
} = require('../controllers/checkInController');

router.use(authenticate);
router.use(apiLimiter);

router.post('/record', authorize('hr', 'admin', 'superadmin'), recordCheckIn);
router.get('/history', authorize('hr', 'admin', 'superadmin'), getCheckInHistory);

module.exports = router;
