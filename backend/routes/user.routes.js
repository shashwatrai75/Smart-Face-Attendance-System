const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const { apiLimiter } = require('../middleware/rateLimit');
const { getProfile, changePassword } = require('../controllers/userController');

router.use(authenticate);
router.use(apiLimiter);

router.get('/me', getProfile);
router.post('/change-password', changePassword);

module.exports = router;

