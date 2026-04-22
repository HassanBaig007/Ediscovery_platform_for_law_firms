// Audit Logging Service
// Comprehensive audit trail for all system operations

import { AuditEntry, AuditFilters } from '../../../../shared/enhanced-types';

export interface AuditLogConfig {
    retentionDays?: number;
    logLevel?: 'minimal' | 'standard' | 'detailed';
}

export class AuditLoggingService {
    private auditLog: AuditEntry[] = [];
    private config: Required<AuditLogConfig>;

    constructor(config: AuditLogConfig = {}) {
        this.config = {
            retentionDays: config.retentionDays || 365,
            logLevel: config.logLevel || 'standard'
        };
    }

    /**
     * Log access to a resource
     */
    async logAccess(
        userId: string,
        resource: string,
        action: string,
        ipAddress?: string,
        userAgent?: string,
        details?: Record<string, any>
    ): Promise<AuditEntry> {
        const entry: AuditEntry = {
            id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId,
            resource,
            action,
            timestamp: new Date(),
            ipAddress: ipAddress || 'unknown',
            userAgent: userAgent || 'unknown',
            details
        };

        this.auditLog.push(entry);
        return entry;
    }

    /**
     * Get audit trail with filters
     */
    async getAuditTrail(filters: AuditFilters): Promise<AuditEntry[]> {
        let filtered = [...this.auditLog];

        // Apply filters
        if (filters.userId) {
            filtered = filtered.filter(entry => entry.userId === filters.userId);
        }

        if (filters.resourceType) {
            filtered = filtered.filter(entry => entry.resource === filters.resourceType);
        }

        if (filters.resourceId) {
            filtered = filtered.filter(entry => 
                entry.details?.resourceId === filters.resourceId
            );
        }

        if (filters.action) {
            filtered = filtered.filter(entry => entry.action === filters.action);
        }

        if (filters.startDate) {
            filtered = filtered.filter(entry => entry.timestamp >= filters.startDate!);
        }

        if (filters.endDate) {
            filtered = filtered.filter(entry => entry.timestamp <= filters.endDate!);
        }

        if (filters.ipAddress) {
            filtered = filtered.filter(entry => entry.ipAddress === filters.ipAddress);
        }

        // Sort by timestamp descending
        filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        // Apply pagination
        const page = filters.page || 1;
        const limit = filters.limit || 50;
        const start = (page - 1) * limit;
        const end = start + limit;

        return filtered.slice(start, end);
    }

    /**
     * Log document access
     */
    async logDocumentAccess(
        userId: string,
        documentId: string,
        action: 'view' | 'download' | 'edit' | 'delete',
        ipAddress?: string,
        userAgent?: string
    ): Promise<AuditEntry> {
        return await this.logAccess(
            userId,
            'document',
            action,
            ipAddress,
            userAgent,
            { resourceId: documentId }
        );
    }

    /**
     * Log case access
     */
    async logCaseAccess(
        userId: string,
        caseId: string,
        action: string,
        ipAddress?: string,
        userAgent?: string
    ): Promise<AuditEntry> {
        return await this.logAccess(
            userId,
            'case',
            action,
            ipAddress,
            userAgent,
            { resourceId: caseId }
        );
    }

    /**
     * Log production access
     */
    async logProductionAccess(
        userId: string,
        productionSetId: string,
        action: string,
        ipAddress?: string,
        userAgent?: string
    ): Promise<AuditEntry> {
        return await this.logAccess(
            userId,
            'production',
            action,
            ipAddress,
            userAgent,
            { resourceId: productionSetId }
        );
    }

    /**
     * Get audit statistics
     */
    getAuditStats(): {
        totalEntries: number;
        entriesByResource: Record<string, number>;
        entriesByAction: Record<string, number>;
        entriesByUser: Record<string, number>;
        recentActivity: AuditEntry[];
    } {
        const entriesByResource: Record<string, number> = {};
        const entriesByAction: Record<string, number> = {};
        const entriesByUser: Record<string, number> = {};

        for (const entry of this.auditLog) {
            entriesByResource[entry.resource] = (entriesByResource[entry.resource] || 0) + 1;
            entriesByAction[entry.action] = (entriesByAction[entry.action] || 0) + 1;
            entriesByUser[entry.userId] = (entriesByUser[entry.userId] || 0) + 1;
        }

        const recentActivity = this.auditLog
            .slice(-20)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        return {
            totalEntries: this.auditLog.length,
            entriesByResource,
            entriesByAction,
            entriesByUser,
            recentActivity
        };
    }

    /**
     * Clean up old audit entries based on retention policy
     */
    async cleanupOldEntries(): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

        const initialCount = this.auditLog.length;
        this.auditLog = this.auditLog.filter(entry => entry.timestamp >= cutoffDate);

        return initialCount - this.auditLog.length;
    }

    /**
     * Export audit trail
     */
    exportAuditTrail(filters: AuditFilters, format: 'json' | 'csv' = 'json'): string {
        const entries = this.auditLog.filter(entry => {
            if (filters.userId && entry.userId !== filters.userId) return false;
            if (filters.resourceType && entry.resource !== filters.resourceType) return false;
            if (filters.action && entry.action !== filters.action) return false;
            if (filters.startDate && entry.timestamp < filters.startDate) return false;
            if (filters.endDate && entry.timestamp > filters.endDate) return false;
            return true;
        });

        if (format === 'json') {
            return JSON.stringify(entries, null, 2);
        }

        // CSV format
        const headers = ['Entry ID', 'User ID', 'Resource', 'Action', 'Timestamp', 'IP Address', 'Details'];
        const rows = entries.map(entry => [
            entry.id,
            entry.userId,
            entry.resource,
            entry.action,
            entry.timestamp.toISOString(),
            entry.ipAddress,
            JSON.stringify(entry.details || {})
        ]);

        const csvLines = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ];

        return csvLines.join('\n');
    }

    /**
     * Search audit log
     */
    searchAuditLog(searchText: string): AuditEntry[] {
        const searchLower = searchText.toLowerCase();

        return this.auditLog.filter(entry => {
            return entry.userId.toLowerCase().includes(searchLower) ||
                   entry.resource.toLowerCase().includes(searchLower) ||
                   entry.action.toLowerCase().includes(searchLower) ||
                   JSON.stringify(entry.details).toLowerCase().includes(searchLower);
        });
    }

    /**
     * Get user activity summary
     */
    getUserActivitySummary(userId: string, days: number = 30): {
        totalActions: number;
        actionsByType: Record<string, number>;
        resourcesAccessed: Set<string>;
        lastActivity?: Date;
    } {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const userEntries = this.auditLog.filter(entry => 
            entry.userId === userId && entry.timestamp >= cutoffDate
        );

        const actionsByType: Record<string, number> = {};
        const resourcesAccessed = new Set<string>();
        let lastActivity: Date | undefined;

        for (const entry of userEntries) {
            actionsByType[entry.action] = (actionsByType[entry.action] || 0) + 1;
            resourcesAccessed.add(entry.resource);
            
            if (!lastActivity || entry.timestamp > lastActivity) {
                lastActivity = entry.timestamp;
            }
        }

        return {
            totalActions: userEntries.length,
            actionsByType,
            resourcesAccessed,
            lastActivity
        };
    }
}
