const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const { apiLimiter } = require('../middleware/rateLimit');
const {
  createClass,
  getClasses,
  getClassesByLecturer,
  updateClass,
  deleteClass,
} = require('../controllers/classController');

router.use(authenticate);
router.use(apiLimiter);

router.post('/', authorize('admin', 'superadmin'), createClass);
router.get('/', getClasses);
router.get('/lecturer/:lecturerId', authorize('admin', 'superadmin'), getClassesByLecturer);
router.put('/:id', authorize('admin', 'superadmin'), updateClass);
router.delete('/:id', authorize('admin', 'superadmin'), deleteClass);

module.exports = router;

