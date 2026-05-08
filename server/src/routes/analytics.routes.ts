import express from 'express';
import { protect, authorize, requireCaseAccess } from '../middleware/authMiddleware';
import {
    getPlatformAnalytics,
    getCaseAnalytics,
    getTeamPerformance,
    getDailyProgress
} from '../controllers/analytics.controller';

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/analytics - Get platform-wide analytics for dashboard page
router.get('/analytics', authorize('ADMIN', 'PARTNER'), getPlatformAnalytics);

// GET /api/cases/:caseId/analytics - Get case analytics
router.get('/cases/:caseId/analytics', requireCaseAccess, getCaseAnalytics);

// GET /api/cases/:caseId/analytics/team - Get team performance
router.get('/cases/:caseId/analytics/team', requireCaseAccess, authorize('ADMIN', 'PARTNER'), getTeamPerformance);

// GET /api/cases/:caseId/analytics/progress - Get daily progress
router.get('/cases/:caseId/analytics/progress', requireCaseAccess, getDailyProgress);

export default router;
