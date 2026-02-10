const express = require('express');
const router = express.Router();
const { login, seedAdmin } = require('../controllers/authController');
const { loginLimiter } = require('../middleware/rateLimit');

router.post('/login', loginLimiter, login);
router.post('/seed-admin', seedAdmin);

module.exports = router;

