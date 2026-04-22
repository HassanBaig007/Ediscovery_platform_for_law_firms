// Production Workflow Service
// Main service that implements the ProductionWorkflow interface

import {
    ProductionWorkflow,
    ProductionConfig,
    LoadFile,
    ExportResult,
    IProductionSet
} from '../../../../shared/enhanced-types';
import { IDocument } from '../../../../shared/types';
import { ProductionSetManager } from './ProductionSetManager';
import { BatesNumberingService, BatesNumberFormat } from './BatesNumberingService';
import { LoadFileGenerator, LoadFileMetadata } from './LoadFileGenerator';
import { ProductionHistoryTracker, ProductionHistoryEntry, ChainOfCustodyRecord } from './ProductionHistoryTracker';

export class ProductionWorkflowService implements ProductionWorkflow {
    private setManager: ProductionSetManager;
    private batesService: BatesNumberingService;
    private loadFileGenerator: LoadFileGenerator;
    private historyTracker: ProductionHistoryTracker;

    constructor() {
        this.setManager = new ProductionSetManager();
        this.batesService = new BatesNumberingService();
        this.loadFileGenerator = new LoadFileGenerator();
        this.historyTracker = new ProductionHistoryTracker();
    }

    /**
     * Create a production set
     */
    async createProductionSet(config: ProductionConfig): Promise<IProductionSet> {
        const productionSet = await this.setManager.createProductionSet(config);

        // Log creation
        await this.historyTracker.logProductionCreated(productionSet, 'system');

        return productionSet;
    }

    /**
     * Apply Bates numbering to production set
     */
    async applyBatesNumbering(productionSetId: string): Promise<void> {
        const productionSet = this.setManager.getProductionSet(productionSetId);

        if (!productionSet) {
            throw new Error(`Production set ${productionSetId} not found`);
        }

        // Define Bates format
        const format: BatesNumberFormat = {
            prefix: 'PROD',
            startNumber: 1,
            digits: 7,
            suffix: ''
        };

        // Apply Bates numbers
        const documentIds = productionSet.documents.map(d => d.documentId);
        const batesMap = await this.batesService.applyBatesNumbering(documentIds, format);

        // Update production set documents with Bates numbers
        for (const doc of productionSet.documents) {
            doc.batesNumber = batesMap.get(doc.documentId);
        }

        // Update status
        await this.setManager.updateProductionSetStatus(productionSetId, 'IN_REVIEW');

        // Log modification
        await this.historyTracker.logProductionModified(
            productionSetId,
            'system',
            ['Applied Bates numbering']
        );
    }

    /**
     * Generate load files for production set
     */
    async generateLoadFiles(productionSetId: string): Promise<LoadFile[]> {
        const productionSet = this.setManager.getProductionSet(productionSetId);

        if (!productionSet) {
            throw new Error(`Production set ${productionSetId} not found`);
        }

        // Prepare metadata for load files
        const metadata: LoadFileMetadata[] = productionSet.documents.map(doc => ({
            documentId: doc.documentId,
            batesNumber: doc.batesNumber || '',
            filename: `document-${doc.documentId}`,
            fileType: 'application/pdf',
            fileSize: 0,
            custodianName: 'Unknown',
            tags: []
        }));

        // Validate metadata
        const validation = this.loadFileGenerator.validateMetadata(metadata);
        if (!validation.isValid) {
            throw new Error(`Load file metadata validation failed: ${validation.errors.join(', ')}`);
        }

        // Generate all load file formats
        const loadFiles = await this.loadFileGenerator.generateAllLoadFiles(
            productionSetId,
            metadata
        );

        return loadFiles;
    }

    /**
     * Export production
     */
    async exportProduction(productionSetId: string): Promise<ExportResult> {
        const productionSet = this.setManager.getProductionSet(productionSetId);

        if (!productionSet) {
            throw new Error(`Production set ${productionSetId} not found`);
        }

        if (productionSet.status !== 'APPROVED') {
            throw new Error('Production set must be approved before export');
        }

        // Generate load files
        const loadFiles = await this.generateLoadFiles(productionSetId);

        // Create export result
        const exportResult: ExportResult = {
            success: true,
            productionSetId,
            documents: productionSet.documentCount,
            files: loadFiles.map(lf => ({
                type: lf.fileType,
                path: lf.filePath,
                size: 0, // Would calculate actual size
                checksum: lf.checksum
            })),
            generatedAt: new Date()
        };

        // Update production set status
        await this.setManager.updateProductionSetStatus(productionSetId, 'PRODUCED');

        // Log export
        await this.historyTracker.logProductionExported(exportResult, 'system');

        return exportResult;
    }

    /**
     * Validate production before export
     */
    async validateProduction(productionSetId: string): Promise<{ valid: boolean; errors: string[] }> {
        const productionSet = this.setManager.getProductionSet(productionSetId);

        if (!productionSet) {
            return {
                valid: false,
                errors: [`Production set ${productionSetId} not found`]
            };
        }

        const errors: string[] = [];

        // Check if all documents have Bates numbers
        const missingBates = productionSet.documents.filter(doc => !doc.batesNumber);
        if (missingBates.length > 0) {
            errors.push(`${missingBates.length} documents missing Bates numbers`);
        }

        // Check for duplicate Bates numbers
        const batesNumbers = productionSet.documents
            .map(doc => doc.batesNumber)
            .filter((num): num is string => num !== undefined);
        
        const uniqueBates = new Set(batesNumbers);
        if (uniqueBates.size !== batesNumbers.length) {
            errors.push('Duplicate Bates numbers detected');
        }

        // Check document count
        if (productionSet.documentCount === 0) {
            errors.push('Production set contains no documents');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get production history
     */
    getProductionHistory(productionSetId: string): ProductionHistoryEntry[] {
        return this.historyTracker.getProductionHistory(productionSetId);
    }

    /**
     * Create chain of custody record
     */
    async createCustodyRecord(
        productionSetId: string,
        documentId: string,
        batesNumber: string,
        initialCustodian: string
    ): Promise<ChainOfCustodyRecord> {
        return await this.historyTracker.createCustodyRecord(
            productionSetId,
            documentId,
            batesNumber,
            initialCustodian
        );
    }

    /**
     * Get custody records for production
     */
    getCustodyRecords(productionSetId: string): ChainOfCustodyRecord[] {
        return this.historyTracker.getProductionCustodyRecords(productionSetId);
    }
}
