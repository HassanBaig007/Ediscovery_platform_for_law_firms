import express from 'express';
import { protect } from '../middleware/authMiddleware';
import {
    getDashboardStats,
    getRecentActivity,
    getOverview
} from '../controllers/dashboard.controller';

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', getDashboardStats);

// GET /api/dashboard/activity - Get recent activity
router.get('/activity', getRecentActivity);

// GET /api/dashboard/overview - Get overview of all cases
router.get('/overview', getOverview);

export default router;
