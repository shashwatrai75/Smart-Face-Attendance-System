const express = require('express');
const router = express.Router({ mergeParams: true });
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const { apiLimiter } = require('../middleware/rateLimit');
const { updateClassSession, deleteClassSession } = require('../controllers/classSessionController');

router.use(authenticate);
router.use(apiLimiter);

router.put('/:id', authorize('admin', 'superadmin', 'lecturer'), updateClassSession);
router.delete('/:id', authorize('admin', 'superadmin', 'lecturer'), deleteClassSession);

module.exports = router;
