import express from 'express';
import { protect, requireCaseAccess } from '../middleware/authMiddleware';
import {
    getReviewQueue,
    submitCoding,
    getCodingHistory,
    getMyReviewQueueCases
} from '../controllers/review.controller';

const router = express.Router();

// Review Queue
router.route('/cases/:caseId/review/queue')
    .get(protect, requireCaseAccess, getReviewQueue);
router.route('/review/my-queue')
    .get(protect, getMyReviewQueueCases);

// Coding Actions
router.route('/documents/:id/code')
    .post(protect, requireCaseAccess, submitCoding);

router.route('/documents/:id/coding-history')
    .get(protect, requireCaseAccess, getCodingHistory);

export default router;
