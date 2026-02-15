const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const { apiLimiter } = require('../middleware/rateLimit');
const {
  enrollStudent,
  getStudents,
  getStudentEmbeddings,
  deleteStudentData,
} = require('../controllers/studentController');

router.use(authenticate);
router.use(apiLimiter);

router.post('/enroll', authorize('admin', 'lecturer'), enrollStudent);
router.get('/', authorize('admin', 'lecturer', 'viewer'), getStudents);
router.get('/embeddings/:classId', authorize('admin', 'lecturer'), getStudentEmbeddings);
router.delete('/:id/delete-data', authorize('admin', 'superadmin'), deleteStudentData);

module.exports = router;

