// Production Set Manager
// Manages production set creation and document selection

import { ProductionConfig, IProductionSet } from '../../../../shared/enhanced-types';
import { IDocument, ProductionSetStatus } from '../../../../shared/types';

export interface DocumentSelectionCriteria {
    caseId: string;
    tagIds?: string[];
    dateRange?: { from?: string; to?: string };
    custodianIds?: string[];
    privilegeStatuses?: string[];
    relevanceStatuses?: string[];
}

export class ProductionSetManager {
    private productionSets: Map<string, IProductionSet> = new Map();

    /**
     * Create a new production set
     */
    async createProductionSet(config: ProductionConfig): Promise<IProductionSet> {
        // Validate configuration
        this.validateProductionConfig(config);

        const productionSet: IProductionSet = {
            id: `prodset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            caseId: config.caseId,
            setName: config.name,
            description: `Production set with ${config.documentIds.length} documents`,
            status: 'DRAFT',
            documents: config.documentIds.map(docId => ({
                documentId: docId,
                isRedacted: config.includeRedactions,
                addedAt: new Date()
            })),
            documentCount: config.documentIds.length,
            createdBy: 'system', // Would be actual user ID
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.productionSets.set(productionSet.id, productionSet);
        return productionSet;
    }

    /**
     * Select documents for production based on criteria
     */
    async selectDocuments(
        criteria: DocumentSelectionCriteria,
        availableDocuments: IDocument[]
    ): Promise<string[]> {
        let selectedDocs = availableDocuments.filter(doc => doc.caseId === criteria.caseId);

        // Filter by tags
        if (criteria.tagIds && criteria.tagIds.length > 0) {
            selectedDocs = selectedDocs.filter(doc => {
                const docTags = Array.isArray(doc.tags) ? doc.tags : [];
                return criteria.tagIds!.some(tagId => docTags.includes(tagId));
            });
        }

        // Filter by date range
        if (criteria.dateRange) {
            selectedDocs = selectedDocs.filter(doc => {
                if (!doc.documentDate) return false;
                
                const docDate = new Date(doc.documentDate);
                
                if (criteria.dateRange!.from) {
                    const fromDate = new Date(criteria.dateRange!.from);
                    if (docDate < fromDate) return false;
                }
                
                if (criteria.dateRange!.to) {
                    const toDate = new Date(criteria.dateRange!.to);
                    if (docDate > toDate) return false;
                }
                
                return true;
            });
        }

        // Filter by custodians
        if (criteria.custodianIds && criteria.custodianIds.length > 0) {
            selectedDocs = selectedDocs.filter(doc => 
                criteria.custodianIds!.includes(doc.custodianId)
            );
        }

        // Filter by privilege status
        if (criteria.privilegeStatuses && criteria.privilegeStatuses.length > 0) {
            selectedDocs = selectedDocs.filter(doc => 
                doc.coding && criteria.privilegeStatuses!.includes(doc.coding.privilegeStatus)
            );
        }

        // Filter by relevance status
        if (criteria.relevanceStatuses && criteria.relevanceStatuses.length > 0) {
            selectedDocs = selectedDocs.filter(doc => 
                doc.coding && criteria.relevanceStatuses!.includes(doc.coding.relevanceStatus)
            );
        }

        return selectedDocs.map(doc => doc.id);
    }

    /**
     * Get production set
     */
    getProductionSet(productionSetId: string): IProductionSet | undefined {
        return this.productionSets.get(productionSetId);
    }

    /**
     * Update production set status
     */
    async updateProductionSetStatus(
        productionSetId: string,
        status: ProductionSetStatus
    ): Promise<IProductionSet> {
        const productionSet = this.productionSets.get(productionSetId);

        if (!productionSet) {
            throw new Error(`Production set ${productionSetId} not found`);
        }

        productionSet.status = status;
        productionSet.updatedAt = new Date();

        if (status === 'APPROVED') {
            productionSet.approvedAt = new Date();
        } else if (status === 'PRODUCED') {
            productionSet.producedAt = new Date();
        }

        this.productionSets.set(productionSetId, productionSet);
        return productionSet;
    }

    /**
     * Add documents to production set
     */
    async addDocumentsToSet(
        productionSetId: string,
        documentIds: string[]
    ): Promise<IProductionSet> {
        const productionSet = this.productionSets.get(productionSetId);

        if (!productionSet) {
            throw new Error(`Production set ${productionSetId} not found`);
        }

        if (productionSet.status !== 'DRAFT') {
            throw new Error('Can only add documents to draft production sets');
        }

        for (const docId of documentIds) {
            // Check if already in set
            const exists = productionSet.documents.some(d => d.documentId === docId);
            
            if (!exists) {
                productionSet.documents.push({
                    documentId: docId,
                    isRedacted: false,
                    addedAt: new Date()
                });
            }
        }

        productionSet.documentCount = productionSet.documents.length;
        productionSet.updatedAt = new Date();

        this.productionSets.set(productionSetId, productionSet);
        return productionSet;
    }

    /**
     * Remove documents from production set
     */
    async removeDocumentsFromSet(
        productionSetId: string,
        documentIds: string[]
    ): Promise<IProductionSet> {
        const productionSet = this.productionSets.get(productionSetId);

        if (!productionSet) {
            throw new Error(`Production set ${productionSetId} not found`);
        }

        if (productionSet.status !== 'DRAFT') {
            throw new Error('Can only remove documents from draft production sets');
        }

        productionSet.documents = productionSet.documents.filter(
            doc => !documentIds.includes(doc.documentId)
        );

        productionSet.documentCount = productionSet.documents.length;
        productionSet.updatedAt = new Date();

        this.productionSets.set(productionSetId, productionSet);
        return productionSet;
    }

    /**
     * Validate production configuration
     */
    private validateProductionConfig(config: ProductionConfig): void {
        if (!config.name || config.name.trim().length === 0) {
            throw new Error('Production set name is required');
        }

        if (!config.caseId) {
            throw new Error('Case ID is required');
        }

        if (!config.documentIds || config.documentIds.length === 0) {
            throw new Error('At least one document is required');
        }

        if (!config.numberingFormat) {
            throw new Error('Numbering format is required');
        }
    }

    /**
     * Get all production sets for a case
     */
    getProductionSetsForCase(caseId: string): IProductionSet[] {
        return Array.from(this.productionSets.values())
            .filter(set => set.caseId === caseId)
            .sort((a, b) => {
                const aTime = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt.getTime();
                const bTime = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt.getTime();
                return bTime - aTime;
            });
    }
}
