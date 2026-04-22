// Redaction Manager Service
// Main service that implements the RedactionManager interface

import {
    RedactionManager,
    Redaction,
    ProductionDocument,
    PrivilegeLogEntry
} from '../../../../shared/enhanced-types';
import { IDocument } from '../../../../shared/types';
import { RedactionService } from './RedactionService';
import { RedactionAuditTrail } from './RedactionAuditTrail';
import { PrivilegeLogManager } from './PrivilegeLogManager';
import { ProductionVersionGenerator } from './ProductionVersionGenerator';

export class RedactionManagerService implements RedactionManager {
    private redactionService: RedactionService;
    private auditTrail: RedactionAuditTrail;
    private privilegeLogManager: PrivilegeLogManager;
    private productionGenerator: ProductionVersionGenerator;

    constructor() {
        this.redactionService = new RedactionService();
        this.auditTrail = new RedactionAuditTrail();
        this.privilegeLogManager = new PrivilegeLogManager();
        this.productionGenerator = new ProductionVersionGenerator();
    }

    /**
     * Apply a redaction to a document
     */
    async applyRedaction(documentId: string, redaction: Redaction): Promise<void> {
        // Apply redaction
        const appliedRedaction = await this.redactionService.applyRedaction(documentId, redaction);

        // Log to audit trail
        await this.auditTrail.logRedactionApplied(
            appliedRedaction,
            appliedRedaction.appliedBy
        );
    }

    /**
     * Generate production version of a document
     */
    async generateProductionVersion(documentId: string): Promise<ProductionDocument> {
        const redactions = this.redactionService.getDocumentRedactions(documentId);
        
        // Generate Bates number (simplified)
        const batesNumber = `PROD-${Date.now()}`;
        
        // Generate production version
        const productionDoc = await this.productionGenerator.generateProductionVersion(
            documentId,
            `/documents/${documentId}`,
            redactions,
            batesNumber,
            'system'
        );

        return productionDoc;
    }

    /**
     * Add entry to privilege log
     */
    async addToPrivilegeLog(entry: PrivilegeLogEntry): Promise<void> {
        // Entry is already created, just store it
        await this.privilegeLogManager.updatePrivilegeLogEntry(entry.id, entry);
    }

    /**
     * Get privilege log for a case
     */
    async getPrivilegeLog(caseId: string): Promise<PrivilegeLogEntry[]> {
        return this.privilegeLogManager.getPrivilegeLog(caseId);
    }

    /**
     * Approve a redaction
     */
    async approveRedaction(redactionId: string, reviewerId: string): Promise<void> {
        const approvedRedaction = await this.redactionService.approveRedaction(redactionId, reviewerId);
        await this.auditTrail.logRedactionApproved(approvedRedaction, reviewerId);
    }

    /**
     * Create privilege log entry for document
     */
    async createPrivilegeLogEntry(
        document: IDocument,
        privilegeReason: string,
        loggedBy: string
    ): Promise<PrivilegeLogEntry> {
        return await this.privilegeLogManager.createPrivilegeLogEntry(
            document,
            privilegeReason,
            loggedBy
        );
    }

    /**
     * Get redactions for a document
     */
    getDocumentRedactions(documentId: string): Redaction[] {
        return this.redactionService.getDocumentRedactions(documentId);
    }

    /**
     * Remove redaction from a document
     */
    async removeRedaction(documentId: string, redactionId: string, userId: string): Promise<void> {
        await this.redactionService.removeRedaction(documentId, redactionId, userId);
    }

    /**
     * Get audit trail for a document
     */
    getDocumentAuditTrail(documentId: string) {
        return this.auditTrail.getDocumentAuditTrail(documentId);
    }

    /**
     * Export privilege log
     */
    exportPrivilegeLog(caseId: string, format: 'csv' | 'json' = 'csv'): string {
        return this.privilegeLogManager.exportPrivilegeLog(caseId, format);
    }
}
