const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const { apiLimiter } = require('../middleware/rateLimit');
const {
  createUser,
  getUsers,
  updateUserStatus,
  deleteUser,
  getStats,
  updateUserNotes,
  updateUserTags,
  verifyUser,
  getUserActivity,
} = require('../controllers/adminController');

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));
router.use(apiLimiter);

router.post('/create-user', createUser);
router.get('/users', getUsers);
router.put('/user/:id/status', updateUserStatus);
router.put('/user/:id/notes', updateUserNotes);
router.put('/user/:id/tags', updateUserTags);
router.put('/user/:id/verify', verifyUser);
router.get('/user/:id/activity', getUserActivity);
router.delete('/user/:id', deleteUser);
router.get('/stats', getStats);

module.exports = router;

