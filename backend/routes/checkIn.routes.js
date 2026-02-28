const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const { apiLimiter } = require('../middleware/rateLimit');
const {
  recordCheckIn,
  getCheckInHistory,
  getDepartmentMemberEmbeddings,
  enrollDepartmentMember,
} = require('../controllers/checkInController');

router.use(authenticate);
router.use(apiLimiter);

router.post('/enroll', authorize('admin', 'superadmin', 'lecturer'), enrollDepartmentMember);
router.post('/record', authorize('superadmin', 'admin', 'lecturer'), recordCheckIn);
router.get('/history', authorize('superadmin', 'admin', 'lecturer', 'viewer'), getCheckInHistory);
router.get('/embeddings/:sectionId', authorize('superadmin', 'admin', 'lecturer'), getDepartmentMemberEmbeddings);

module.exports = router;
