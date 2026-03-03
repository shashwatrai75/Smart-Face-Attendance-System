const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const { apiLimiter } = require('../middleware/rateLimit');
const { enrollFace, verifyFace } = require('../controllers/faceController');

router.use(authenticate);
router.use(apiLimiter);

// POST /api/face/enroll
router.post('/enroll', enrollFace);

// POST /api/face/verify
router.post('/verify', verifyFace);

module.exports = router;

