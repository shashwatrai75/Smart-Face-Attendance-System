const express = require('express');
const router = express.Router();
const { login, recoveryQuestions, recoveryResetPassword, seedAdmin } = require('../controllers/authController');
const {
  loginLimiter,
  passwordResetRequestLimiter,
  passwordResetSubmitLimiter,
} = require('../middleware/rateLimit');

router.post('/login', loginLimiter, login);
router.post('/recovery/questions', passwordResetRequestLimiter, recoveryQuestions);
router.post('/recovery/reset', passwordResetSubmitLimiter, recoveryResetPassword);
router.post('/seed-admin', seedAdmin);

module.exports = router;

