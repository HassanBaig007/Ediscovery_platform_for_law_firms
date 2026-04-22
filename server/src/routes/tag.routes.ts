import express from 'express';
import { protect, requireCaseAccess, requireCaseRole } from '../middleware/authMiddleware';
import {
    getTags,
    createTag,
    updateTag,
    deleteTag,
    addTagToDocument,
    removeTagFromDocument
} from '../controllers/tag.controller';

const router = express.Router();

// Case-scoped Tag Management
router.route('/cases/:caseId/tags')
    .get(protect, requireCaseAccess, getTags)
    .post(protect, requireCaseRole('LEAD'), createTag);

router.route('/cases/:caseId/tags/:id')
    .put(protect, requireCaseRole('LEAD'), updateTag)
    .delete(protect, requireCaseRole('LEAD'), deleteTag);

// Document-scoped Tag Application
router.route('/documents/:id/tags')
    .post(protect, requireCaseAccess, addTagToDocument);

router.route('/documents/:id/tags/:tagId')
    .delete(protect, requireCaseAccess, removeTagFromDocument);

export default router;
