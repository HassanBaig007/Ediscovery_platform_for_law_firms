import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Notification from '../models/Notification';

/**
 * @desc    Get notifications for current user
 * @route   GET /api/notifications
 * @access  Private
 */
export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!._id;
        const { page = 1, limit = 20, unreadOnly } = req.query;
        
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        const query: Record<string, unknown> = { userId };
        
        if (unreadOnly === 'true') {
            query.isRead = false;
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        const total = await Notification.countDocuments(query);
        const unreadCount = await Notification.countDocuments({ userId, isRead: false });

        res.json({
            notifications,
            page: pageNum,
            pages: Math.ceil(total / limitNum),
            total,
            unreadCount
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        res.status(500).json({ message });
    }
};

/**
 * @desc    Mark notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!._id;

        const notification = await Notification.findOneAndUpdate(
            { _id: id, userId },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            res.status(404).json({ message: 'Notification not found' });
            return;
        }

        res.json(notification);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        res.status(500).json({ message });
    }
};

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/notifications/read-all
 * @access  Private
 */
export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!._id;

        await Notification.updateMany(
            { userId, isRead: false },
            { isRead: true }
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        res.status(500).json({ message });
    }
};

/**
 * @desc    Delete notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
export const deleteNotification = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!._id;

        const notification = await Notification.findOneAndDelete({ _id: id, userId });

        if (!notification) {
            res.status(404).json({ message: 'Notification not found' });
            return;
        }

        res.json({ message: 'Notification deleted' });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        res.status(500).json({ message });
    }
};

/**
 * @desc    Delete multiple notifications
 * @route   POST /api/notifications/delete-batch
 * @access  Private
 */
export const deleteBatch = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { ids } = req.body;
        const userId = req.user!._id;

        if (!Array.isArray(ids) || ids.length === 0) {
            res.status(400).json({ message: 'Invalid notification IDs' });
            return;
        }

        await Notification.deleteMany({ _id: { $in: ids }, userId });

        res.json({ message: 'Notifications deleted' });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        res.status(500).json({ message });
    }
};

/**
 * @desc    Create notification (internal use)
 * @route   POST /api/notifications
 * @access  Private (Internal)
 */
export const createNotification = async (
    userId: string,
    type: 'DOCUMENT' | 'CASE' | 'REVIEW' | 'SYSTEM' | 'USER',
    title: string,
    message: string,
    link?: string,
    metadata?: Record<string, unknown>
): Promise<void> => {
    try {
        await Notification.create({
            userId,
            type,
            title,
            message,
            link,
            metadata
        });
    } catch (error) {
        console.error('Failed to create notification:', error);
    }
};
