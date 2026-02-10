const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const { apiLimiter } = require('../middleware/rateLimit');
const { exportReport, getSummary, getClassWiseData, getTrendData } = require('../controllers/reportController');

router.use(authenticate);
router.use(authorize('admin', 'teacher', 'viewer'));
router.use(apiLimiter);

router.get('/summary', getSummary);
router.get('/class', getClassWiseData);
router.get('/trend', getTrendData);
router.get('/export', exportReport);

module.exports = router;

