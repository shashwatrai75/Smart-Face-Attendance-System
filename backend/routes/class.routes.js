const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const { apiLimiter } = require('../middleware/rateLimit');
const {
  createClass,
  getClasses,
  getClassesByTeacher,
  updateClass,
  deleteClass,
} = require('../controllers/classController');

router.use(authenticate);
router.use(apiLimiter);

router.post('/', authorize('admin'), createClass);
router.get('/', getClasses);
router.get('/teacher/:teacherId', authorize('admin'), getClassesByTeacher);
router.put('/:id', authorize('admin'), updateClass);
router.delete('/:id', authorize('admin'), deleteClass);

module.exports = router;

