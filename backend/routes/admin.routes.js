const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const { apiLimiter } = require('../middleware/rateLimit');
const {
  createUser,
  getUsers,
  updateUserStatus,
  updateUser,
  deleteUser,
  getStats,
  updateUserNotes,
  updateUserTags,
  verifyUser,
  getUserActivity,
  uploadUserImage,
  enrollEmployee,
} = require('../controllers/adminController');

router.use(authenticate);
router.use(apiLimiter);

// Enroll employee: hr, superadmin only
router.post('/enroll-employee', authorize('hr', 'superadmin'), enrollEmployee);

// Rest: admin, superadmin only
router.use(authorize('admin', 'superadmin'));
router.post('/create-user', createUser);
router.get('/users', getUsers);
router.put('/user/:id/status', updateUserStatus);
router.put('/user/:id', updateUser);
router.put('/user/:id/notes', updateUserNotes);
router.put('/user/:id/tags', updateUserTags);
router.put('/user/:id/verify', verifyUser);
router.post('/user/:id/image', uploadUserImage);
router.get('/user/:id/activity', getUserActivity);
router.delete('/user/:id', deleteUser);
router.get('/stats', getStats);

module.exports = router;

