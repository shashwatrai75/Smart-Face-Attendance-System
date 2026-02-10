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

router.post('/enroll', authorize('admin', 'teacher'), enrollStudent);
router.get('/', authorize('admin', 'teacher', 'viewer'), getStudents);
router.get('/embeddings/:classId', authorize('admin', 'teacher'), getStudentEmbeddings);
router.delete('/:id/delete-data', authorize('admin'), deleteStudentData);

module.exports = router;

