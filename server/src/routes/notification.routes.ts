import express from 'express';
import { protect } from '../middleware/authMiddleware';
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteBatch
} from '../controllers/notification.controller';

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/notifications - Get all notifications for current user
router.get('/', getNotifications);

// PATCH /api/notifications/:id/read - Mark notification as read
router.patch('/:id/read', markAsRead);

// PATCH /api/notifications/read-all - Mark all as read
router.patch('/read-all', markAllAsRead);

// DELETE /api/notifications/:id - Delete single notification
router.delete('/:id', deleteNotification);

// POST /api/notifications/delete-batch - Delete multiple notifications
router.post('/delete-batch', deleteBatch);

export default router;
