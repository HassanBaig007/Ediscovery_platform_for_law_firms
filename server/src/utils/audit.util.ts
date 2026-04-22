import AuditLog from '../models/AuditLog';

export const logAction = async (
    userId: string | any,
    action: string,
    entityType: string,
    entityId?: string | any,
    details?: any,
    ipAddress?: string
): Promise<void> => {
    try {
        await AuditLog.create({
            userId,
            action,
            entityType,
            entityId: entityId ? entityId.toString() : undefined,
            details,
            ipAddress
        });
    } catch (error) {
        console.error('Failed to log audit action:', error);
    }
};