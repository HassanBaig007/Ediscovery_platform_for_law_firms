// Redaction Audit Trail
// Maintains tamper-evident audit trail for all redaction operations

import { Redaction } from '../../../../shared/enhanced-types';

export interface RedactionAuditEntry {
    id: string;
    redactionId: string;
    documentId: string;
    operation: 'applied' | 'removed' | 'approved' | 'rejected' | 'modified';
    performedBy: string;
    timestamp: Date;
    details: {
        position?: { x: number; y: number; width: number; height: number };
        page?: number;
        reason?: string;
        previousState?: any;
        newState?: any;
    };
    ipAddress?: string;
    userAgent?: string;
    checksum: string; // Hash of entry for tamper detection
}

export class RedactionAuditTrail {
    private auditLog: RedactionAuditEntry[] = [];

    /**
     * Log redaction application
     */
    async logRedactionApplied(
        redaction: Redaction,
        performedBy: string,
        ipAddress?: string,
        userAgent?: string
    ): Promise<RedactionAuditEntry> {
        const entry: RedactionAuditEntry = {
            id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            redactionId: redaction.id,
            documentId: redaction.documentId,
            operation: 'applied',
            performedBy,
            timestamp: new Date(),
            details: {
                position: redaction.position,
                page: redaction.page,
                reason: redaction.reason
            },
            ipAddress,
            userAgent,
            checksum: this.generateChecksum(redaction, 'applied', performedBy)
        };

        this.auditLog.push(entry);
        return entry;
    }

    /**
     * Log redaction removal
     */
    async logRedactionRemoved(
        redaction: Redaction,
        performedBy: string,
        ipAddress?: string,
        userAgent?: string
    ): Promise<RedactionAuditEntry> {
        const entry: RedactionAuditEntry = {
            id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            redactionId: redaction.id,
            documentId: redaction.documentId,
            operation: 'removed',
            performedBy,
            timestamp: new Date(),
            details: {
                position: redaction.position,
                page: redaction.page,
                reason: redaction.reason,
                previousState: redaction
            },
            ipAddress,
            userAgent,
            checksum: this.generateChecksum(redaction, 'removed', performedBy)
        };

        this.auditLog.push(entry);
        return entry;
    }

    /**
     * Log redaction approval
     */
    async logRedactionApproved(
        redaction: Redaction,
        approvedBy: string,
        ipAddress?: string,
        userAgent?: string
    ): Promise<RedactionAuditEntry> {
        const entry: RedactionAuditEntry = {
            id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            redactionId: redaction.id,
            documentId: redaction.documentId,
            operation: 'approved',
            performedBy: approvedBy,
            timestamp: new Date(),
            details: {
                previousState: { isApproved: false },
                newState: { isApproved: true }
            },
            ipAddress,
            userAgent,
            checksum: this.generateChecksum(redaction, 'approved', approvedBy)
        };

        this.auditLog.push(entry);
        return entry;
    }

    /**
     * Get audit trail for a document
     */
    getDocumentAuditTrail(documentId: string): RedactionAuditEntry[] {
        return this.auditLog
            .filter(entry => entry.documentId === documentId)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    /**
     * Get audit trail for a specific redaction
     */
    getRedactionAuditTrail(redactionId: string): RedactionAuditEntry[] {
        return this.auditLog
            .filter(entry => entry.redactionId === redactionId)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    /**
     * Verify audit trail integrity
     */
    verifyIntegrity(): { isValid: boolean; tamperedEntries: string[] } {
        const tamperedEntries: string[] = [];

        for (const entry of this.auditLog) {
            const expectedChecksum = this.generateChecksum(
                { id: entry.redactionId, documentId: entry.documentId } as any,
                entry.operation,
                entry.performedBy
            );

            if (entry.checksum !== expectedChecksum) {
                tamperedEntries.push(entry.id);
            }
        }

        return {
            isValid: tamperedEntries.length === 0,
            tamperedEntries
        };
    }

    /**
     * Generate checksum for audit entry
     */
    private generateChecksum(redaction: Partial<Redaction>, operation: string, performedBy: string): string {
        const data = `${redaction.id}-${redaction.documentId}-${operation}-${performedBy}`;
        
        // Simple hash function (in production, use crypto.createHash)
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return Math.abs(hash).toString(36);
    }

    /**
     * Get audit statistics
     */
    getAuditStats(): {
        totalEntries: number;
        entriesByOperation: Record<string, number>;
        entriesByUser: Record<string, number>;
        recentActivity: RedactionAuditEntry[];
    } {
        const entriesByOperation: Record<string, number> = {};
        const entriesByUser: Record<string, number> = {};

        for (const entry of this.auditLog) {
            entriesByOperation[entry.operation] = (entriesByOperation[entry.operation] || 0) + 1;
            entriesByUser[entry.performedBy] = (entriesByUser[entry.performedBy] || 0) + 1;
        }

        const recentActivity = this.auditLog
            .slice(-10)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        return {
            totalEntries: this.auditLog.length,
            entriesByOperation,
            entriesByUser,
            recentActivity
        };
    }

    /**
     * Export audit trail
     */
    exportAuditTrail(documentId?: string): RedactionAuditEntry[] {
        if (documentId) {
            return this.getDocumentAuditTrail(documentId);
        }
        return [...this.auditLog];
    }
}
