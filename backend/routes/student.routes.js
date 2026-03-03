const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const { apiLimiter } = require('../middleware/rateLimit');
const {
  enrollStudent,
  getStudents,
  deleteStudentData,
} = require('../controllers/studentController');

router.use(authenticate);
router.use(apiLimiter);

router.post('/enroll', authorize('lecturer', 'admin', 'superadmin'), enrollStudent);
router.get('/', authorize('lecturer', 'admin', 'superadmin'), getStudents);
// Embedding-based endpoint removed; face recognition now uses /api/face/verify
router.delete('/:id/delete-data', authorize('admin', 'superadmin'), deleteStudentData);

module.exports = router;

