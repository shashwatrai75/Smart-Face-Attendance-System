const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
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

router.use(authenticate);
router.use(apiLimiter);

router.post('/', authorize('admin', 'superadmin'), createSection);
router.get('/', getSections);
router.get('/:id', getSectionById);
router.put('/:id', authorize('admin', 'superadmin'), updateSection);
router.delete('/:id', authorize('admin', 'superadmin'), deleteSection);
router.post('/:id/members', authorize('admin', 'superadmin'), addSectionMember);
router.delete('/:id/members/:userId', authorize('admin', 'superadmin'), removeSectionMember);

module.exports = router;
