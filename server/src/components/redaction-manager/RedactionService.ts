// Redaction Service
// Manages redaction application and coordinate storage

import { Redaction, ProductionDocument } from '../../../../shared/enhanced-types';

export interface RedactionArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

export class RedactionService {
    private redactions: Map<string, Redaction[]> = new Map(); // documentId -> Redaction[]
    private productionVersions: Map<string, ProductionDocument> = new Map();

    /**
     * Apply a redaction to a document
     */
    async applyRedaction(documentId: string, redaction: Omit<Redaction, 'id'>): Promise<Redaction> {
        const fullRedaction: Redaction = {
            id: `redaction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ...redaction
        };

        // Validate redaction coordinates
        this.validateRedactionArea(fullRedaction.position);

        // Store redaction
        if (!this.redactions.has(documentId)) {
            this.redactions.set(documentId, []);
        }

        this.redactions.get(documentId)!.push(fullRedaction);

        return fullRedaction;
    }

    /**
     * Get all redactions for a document
     */
    getDocumentRedactions(documentId: string): Redaction[] {
        return this.redactions.get(documentId) || [];
    }

    /**
     * Remove a redaction
     */
    async removeRedaction(documentId: string, redactionId: string, userId: string): Promise<void> {
        const redactions = this.redactions.get(documentId);

        if (!redactions) {
            throw new Error(`No redactions found for document ${documentId}`);
        }

        const redactionIndex = redactions.findIndex(r => r.id === redactionId);

        if (redactionIndex === -1) {
            throw new Error(`Redaction ${redactionId} not found`);
        }

        const redaction = redactions[redactionIndex];

        // Only the person who applied it or an admin can remove
        if (redaction.appliedBy !== userId) {
            throw new Error('Only the user who applied the redaction can remove it');
        }

        redactions.splice(redactionIndex, 1);
    }

    /**
     * Approve a redaction
     */
    async approveRedaction(redactionId: string, reviewerId: string): Promise<Redaction> {
        // Find redaction
        let foundRedaction: Redaction | undefined;
        let documentId: string | undefined;

        for (const [docId, redactions] of this.redactions.entries()) {
            const redaction = redactions.find(r => r.id === redactionId);
            if (redaction) {
                foundRedaction = redaction;
                documentId = docId;
                break;
            }
        }

        if (!foundRedaction || !documentId) {
            throw new Error(`Redaction ${redactionId} not found`);
        }

        // Update redaction
        foundRedaction.reviewedBy = reviewerId;
        foundRedaction.reviewedAt = new Date();
        foundRedaction.isApproved = true;

        return foundRedaction;
    }

    /**
     * Generate production version of a document with redactions applied
     */
    async generateProductionVersion(
        documentId: string,
        originalFilePath: string,
        batesNumber: string,
        generatedBy: string
    ): Promise<ProductionDocument> {
        const redactions = this.getDocumentRedactions(documentId);

        const productionDoc: ProductionDocument = {
            id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            originalDocumentId: documentId,
            batesNumber,
            isRedacted: redactions.length > 0,
            redactions,
            filePath: `productions/${documentId}/${batesNumber}.pdf`,
            generatedAt: new Date(),
            generatedBy
        };

        this.productionVersions.set(productionDoc.id, productionDoc);

        return productionDoc;
    }

    /**
     * Get production version
     */
    getProductionVersion(productionId: string): ProductionDocument | undefined {
        return this.productionVersions.get(productionId);
    }

    /**
     * Validate redaction area coordinates
     */
    private validateRedactionArea(area: RedactionArea): void {
        if (area.x < 0 || area.y < 0) {
            throw new Error('Redaction coordinates cannot be negative');
        }

        if (area.width <= 0 || area.height <= 0) {
            throw new Error('Redaction dimensions must be positive');
        }

        if (area.x > 10000 || area.y > 10000) {
            throw new Error('Redaction coordinates exceed maximum page dimensions');
        }
    }

    /**
     * Check if redactions overlap
     */
    checkRedactionOverlap(redaction1: Redaction, redaction2: Redaction): boolean {
        if (redaction1.page !== redaction2.page) {
            return false;
        }

        const r1 = redaction1.position;
        const r2 = redaction2.position;

        return !(
            r1.x + r1.width < r2.x ||
            r2.x + r2.width < r1.x ||
            r1.y + r1.height < r2.y ||
            r2.y + r2.height < r1.y
        );
    }

    /**
     * Get overlapping redactions
     */
    getOverlappingRedactions(documentId: string, redaction: Redaction): Redaction[] {
        const allRedactions = this.getDocumentRedactions(documentId);
        return allRedactions.filter(r => 
            r.id !== redaction.id && this.checkRedactionOverlap(r, redaction)
        );
    }

    /**
     * Merge overlapping redactions
     */
    mergeRedactions(redactions: Redaction[]): RedactionArea {
        if (redactions.length === 0) {
            throw new Error('At least one redaction is required for merging');
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const redaction of redactions) {
            const r = redaction.position;
            minX = Math.min(minX, r.x);
            minY = Math.min(minY, r.y);
            maxX = Math.max(maxX, r.x + r.width);
            maxY = Math.max(maxY, r.y + r.height);
        }

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }
}
