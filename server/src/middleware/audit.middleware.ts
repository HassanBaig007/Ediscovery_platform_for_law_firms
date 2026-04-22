import { IUserDocument } from '../models/User';
import AuditLog from '../models/AuditLog';

export const logAction = async (
    user: IUserDocument,
    action: string,
    entityType: string,
    entityId: string,
    details?: any,
    ipAddress?: string
) => {
    try {
        await AuditLog.create({
            userId: user._id.toString(),
            action,
            entityType,
            entityId,
            details,
            ipAddress
        });
    } catch (error) {
        console.error('Audit Log Error:', error);
        // Do not throw, audit failure should not block action
    }
};
