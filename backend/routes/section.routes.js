const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const authorizeSuperadmin = require('../middleware/superadminMiddleware');
const { apiLimiter } = require('../middleware/rateLimit');
const {
  createSection,
  getSections,
  getSectionById,
  updateSection,
  deleteSection,
  addSectionMember,
  removeSectionMember,
} = require('../controllers/sectionController');
const {
  getClassSessionsBySection,
  createClassSession,
} = require('../controllers/classSessionController');

router.use(authenticate);
router.use(apiLimiter);

router.post('/', authorize('admin', 'superadmin'), createSection);
router.get('/', getSections);
router.get('/:id', getSectionById);
router.put('/:id', authorize('admin', 'superadmin'), updateSection);
router.delete('/:id', authorize('superadmin'), deleteSection);
router.post('/:id/members', authorize('admin', 'superadmin', 'hr'), addSectionMember);
router.delete('/:id/members/:userId', authorize('admin', 'superadmin'), removeSectionMember);
router.get('/:id/class-sessions', getClassSessionsBySection);
router.post('/:id/class-sessions', authorize('admin', 'superadmin', 'member'), createClassSession);

module.exports = router;
