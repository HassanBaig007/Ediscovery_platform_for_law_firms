// Privilege Log Manager
// Automates privilege log creation and management

import { PrivilegeLogEntry } from '../../../../shared/enhanced-types';
import { IDocument } from '../../../../shared/types';

export interface PrivilegeCategory {
    code: string;
    name: string;
    description: string;
}

export class PrivilegeLogManager {
    private privilegeLog: Map<string, PrivilegeLogEntry> = new Map();
    private privilegeCategories: PrivilegeCategory[] = [
        {
            code: 'AC',
            name: 'Attorney-Client Privilege',
            description: 'Communications between attorney and client'
        },
        {
            code: 'WP',
            name: 'Work Product',
            description: 'Materials prepared in anticipation of litigation'
        },
        {
            code: 'JC',
            name: 'Joint Client',
            description: 'Communications involving joint clients'
        },
        {
            code: 'CC',
            name: 'Common Interest',
            description: 'Communications under common interest doctrine'
        }
    ];

    /**
     * Automatically create privilege log entry for a privileged document
     */
    async createPrivilegeLogEntry(
        document: IDocument,
        privilegeReason: string,
        loggedBy: string
    ): Promise<PrivilegeLogEntry> {
        // Extract metadata for privilege log
        const description = this.generatePrivilegeDescription(document, privilegeReason);

        const entry: PrivilegeLogEntry = {
            id: `priv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            documentId: document.id,
            caseId: document.caseId,
            privilegeReason,
            description,
            loggedBy,
            loggedAt: new Date(),
            status: 'pending'
        };

        this.privilegeLog.set(entry.id, entry);
        return entry;
    }

    /**
     * Generate privilege description from document metadata
     */
    private generatePrivilegeDescription(document: IDocument, privilegeReason: string): string {
        const parts: string[] = [];

        // Document type
        parts.push(`Document Type: ${document.fileType}`);

        // Date
        if (document.documentDate) {
            const date = new Date(document.documentDate);
            parts.push(`Date: ${date.toLocaleDateString()}`);
        }

        // Custodian
        parts.push(`Custodian: ${document.custodianId}`);

        // Privilege reason
        parts.push(`Privilege Basis: ${privilegeReason}`);

        // Filename
        parts.push(`Filename: ${document.filename}`);

        return parts.join('; ');
    }

    /**
     * Get privilege log for a case
     */
    getPrivilegeLog(caseId: string): PrivilegeLogEntry[] {
        return Array.from(this.privilegeLog.values())
            .filter(entry => entry.caseId === caseId)
            .sort((a, b) => b.loggedAt.getTime() - a.loggedAt.getTime());
    }

    /**
     * Get privilege log entry
     */
    getPrivilegeLogEntry(entryId: string): PrivilegeLogEntry | undefined {
        return this.privilegeLog.get(entryId);
    }

    /**
     * Update privilege log entry
     */
    async updatePrivilegeLogEntry(
        entryId: string,
        updates: Partial<PrivilegeLogEntry>
    ): Promise<PrivilegeLogEntry> {
        const entry = this.privilegeLog.get(entryId);

        if (!entry) {
            throw new Error(`Privilege log entry ${entryId} not found`);
        }

        const updated: PrivilegeLogEntry = {
            ...entry,
            ...updates
        };

        this.privilegeLog.set(entryId, updated);
        return updated;
    }

    /**
     * Review privilege log entry
     */
    async reviewPrivilegeLogEntry(
        entryId: string,
        reviewedBy: string,
        status: 'approved' | 'rejected',
        notes?: string
    ): Promise<PrivilegeLogEntry> {
        const entry = this.privilegeLog.get(entryId);

        if (!entry) {
            throw new Error(`Privilege log entry ${entryId} not found`);
        }

        entry.reviewedBy = reviewedBy;
        entry.reviewedAt = new Date();
        entry.status = status;
        
        if (notes) {
            entry.notes = notes;
        }

        this.privilegeLog.set(entryId, entry);
        return entry;
    }

    /**
     * Get privilege categories
     */
    getPrivilegeCategories(): PrivilegeCategory[] {
        return [...this.privilegeCategories];
    }

    /**
     * Categorize privilege reason
     */
    categorizePrivilegeReason(reason: string): PrivilegeCategory | undefined {
        const reasonLower = reason.toLowerCase();

        for (const category of this.privilegeCategories) {
            if (reasonLower.includes(category.name.toLowerCase()) ||
                reasonLower.includes(category.code.toLowerCase())) {
                return category;
            }
        }

        return undefined;
    }

    /**
     * Export privilege log
     */
    exportPrivilegeLog(caseId: string, format: 'csv' | 'json' = 'csv'): string {
        const entries = this.getPrivilegeLog(caseId);

        if (format === 'json') {
            return JSON.stringify(entries, null, 2);
        }

        // CSV format
        const headers = [
            'Entry ID',
            'Document ID',
            'Case ID',
            'Privilege Reason',
            'Description',
            'Logged By',
            'Logged At',
            'Status',
            'Reviewed By',
            'Reviewed At',
            'Notes'
        ];

        const rows = entries.map(entry => [
            entry.id,
            entry.documentId,
            entry.caseId,
            entry.privilegeReason,
            entry.description,
            entry.loggedBy,
            entry.loggedAt.toISOString(),
            entry.status,
            entry.reviewedBy || '',
            entry.reviewedAt?.toISOString() || '',
            entry.notes || ''
        ]);

        const csvLines = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ];

        return csvLines.join('\n');
    }

    /**
     * Get privilege log statistics
     */
    getPrivilegeLogStats(caseId: string): {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
        byReason: Record<string, number>;
    } {
        const entries = this.getPrivilegeLog(caseId);

        const stats = {
            total: entries.length,
            pending: 0,
            approved: 0,
            rejected: 0,
            byReason: {} as Record<string, number>
        };

        for (const entry of entries) {
            // Count by status
            if (entry.status === 'pending') stats.pending++;
            else if (entry.status === 'approved') stats.approved++;
            else if (entry.status === 'rejected') stats.rejected++;

            // Count by reason
            stats.byReason[entry.privilegeReason] = (stats.byReason[entry.privilegeReason] || 0) + 1;
        }

        return stats;
    }
}
