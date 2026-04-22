import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import AuditLog from '../models/AuditLog';
import { getSyntheticUserIds } from '../utils/syntheticFilters';

/**
 * @desc    Get audit logs (paginated, filterable)
 * @route   GET /api/audit-logs
 * @access  Private (Admin / Partner)
 */
export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { page = 1, limit = 50, action, entityType, dateFrom, dateTo } = req.query;

        const pageNum = Number(page);
        const limitNum = Math.min(Number(limit), 200); // cap at 200
        const skip = (pageNum - 1) * limitNum;

        const query: Record<string, unknown> = {};

        if (action && action !== 'ALL') query.action = action;
        if (entityType && entityType !== 'ALL') query.entityType = entityType;

        if (dateFrom || dateTo) {
            const dateFilter: Record<string, Date> = {};
            if (dateFrom) dateFilter['$gte'] = new Date(dateFrom as string);
            if (dateTo) dateFilter['$lte'] = new Date(dateTo as string);
            query['createdAt'] = dateFilter;
        }

        const syntheticUserIds = await getSyntheticUserIds();
        if (syntheticUserIds.length > 0) {
            query.userId = { $nin: syntheticUserIds };
        }

        const logs = await AuditLog.find(query)
            .populate('userId', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        const total = await AuditLog.countDocuments(query);

        const formattedLogs = logs.map(log => {
            const populatedUser = log.userId as any;
            return {
                id: (log as any)._id,
                userId: populatedUser?._id || log.userId,
                userName: populatedUser
                    ? `${populatedUser.firstName} ${populatedUser.lastName}`
                    : 'Unknown',
                userEmail: populatedUser?.email || '',
                action: log.action,
                entityType: log.entityType,
                entityId: log.entityId,
                details: log.details,
                ipAddress: log.ipAddress,
                createdAt: (log as any).createdAt,
            };
        });

        res.json({
            logs: formattedLogs,
            page: pageNum,
            pages: Math.ceil(total / limitNum),
            total,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        res.status(500).json({ message });
    }
};
