// Production History Tracker
// Maintains chain of custody and production audit trail

import { ExportResult, IProductionSet } from '../../../../shared/enhanced-types';

export interface ProductionHistoryEntry {
    id: string;
    productionSetId: string;
    operation: 'created' | 'approved' | 'exported' | 'modified' | 'cancelled';
    performedBy: string;
    timestamp: Date;
    details: {
        previousState?: any;
        newState?: any;
        exportFormat?: string;
        documentCount?: number;
        changes?: string[];
    };
    ipAddress?: string;
    userAgent?: string;
}

export interface ChainOfCustodyRecord {
    id: string;
    productionSetId: string;
    documentId: string;
    batesNumber: string;
    custodyChain: Array<{
        transferredFrom: string;
        transferredTo: string;
        timestamp: Date;
        reason: string;
        verifiedBy?: string;
    }>;
    currentCustodian: string;
    createdAt: Date;
}

export class ProductionHistoryTracker {
    private history: ProductionHistoryEntry[] = [];
    private custodyRecords: Map<string, ChainOfCustodyRecord> = new Map();

    /**
     * Log production set creation
     */
    async logProductionCreated(
        productionSet: IProductionSet,
        createdBy: string,
        ipAddress?: string
    ): Promise<ProductionHistoryEntry> {
        const entry: ProductionHistoryEntry = {
            id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            productionSetId: productionSet.id,
            operation: 'created',
            performedBy: createdBy,
            timestamp: new Date(),
            details: {
                documentCount: productionSet.documentCount,
                newState: {
                    name: productionSet.setName,
                    status: productionSet.status
                }
            },
            ipAddress
        };

        this.history.push(entry);
        return entry;
    }

    /**
     * Log production set approval
     */
    async logProductionApproved(
        productionSetId: string,
        approvedBy: string,
        ipAddress?: string
    ): Promise<ProductionHistoryEntry> {
        const entry: ProductionHistoryEntry = {
            id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            productionSetId,
            operation: 'approved',
            performedBy: approvedBy,
            timestamp: new Date(),
            details: {
                previousState: { status: 'IN_REVIEW' },
                newState: { status: 'APPROVED' }
            },
            ipAddress
        };

        this.history.push(entry);
        return entry;
    }

    /**
     * Log production export
     */
    async logProductionExported(
        exportResult: ExportResult,
        exportedBy: string,
        ipAddress?: string
    ): Promise<ProductionHistoryEntry> {
        const entry: ProductionHistoryEntry = {
            id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            productionSetId: exportResult.productionSetId,
            operation: 'exported',
            performedBy: exportedBy,
            timestamp: new Date(),
            details: {
                documentCount: exportResult.documents,
                exportFormat: exportResult.files.map(f => f.type).join(', ')
            },
            ipAddress
        };

        this.history.push(entry);
        return entry;
    }

    /**
     * Log production modification
     */
    async logProductionModified(
        productionSetId: string,
        modifiedBy: string,
        changes: string[],
        ipAddress?: string
    ): Promise<ProductionHistoryEntry> {
        const entry: ProductionHistoryEntry = {
            id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            productionSetId,
            operation: 'modified',
            performedBy: modifiedBy,
            timestamp: new Date(),
            details: {
                changes
            },
            ipAddress
        };

        this.history.push(entry);
        return entry;
    }

    /**
     * Get production history
     */
    getProductionHistory(productionSetId: string): ProductionHistoryEntry[] {
        return this.history
            .filter(entry => entry.productionSetId === productionSetId)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
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
        const record: ChainOfCustodyRecord = {
            id: `custody-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            productionSetId,
            documentId,
            batesNumber,
            custodyChain: [],
            currentCustodian: initialCustodian,
            createdAt: new Date()
        };

        this.custodyRecords.set(record.id, record);
        return record;
    }

    /**
     * Transfer custody
     */
    async transferCustody(
        recordId: string,
        transferredTo: string,
        reason: string,
        verifiedBy?: string
    ): Promise<ChainOfCustodyRecord> {
        const record = this.custodyRecords.get(recordId);

        if (!record) {
            throw new Error(`Custody record ${recordId} not found`);
        }

        record.custodyChain.push({
            transferredFrom: record.currentCustodian,
            transferredTo,
            timestamp: new Date(),
            reason,
            verifiedBy
        });

        record.currentCustodian = transferredTo;
        this.custodyRecords.set(recordId, record);

        return record;
    }

    /**
     * Get chain of custody for a document
     */
    getCustodyRecord(documentId: string): ChainOfCustodyRecord | undefined {
        return Array.from(this.custodyRecords.values())
            .find(record => record.documentId === documentId);
    }

    /**
     * Get all custody records for a production set
     */
    getProductionCustodyRecords(productionSetId: string): ChainOfCustodyRecord[] {
        return Array.from(this.custodyRecords.values())
            .filter(record => record.productionSetId === productionSetId);
    }

    /**
     * Export production history
     */
    exportHistory(productionSetId: string, format: 'json' | 'csv' = 'json'): string {
        const entries = this.getProductionHistory(productionSetId);

        if (format === 'json') {
            return JSON.stringify(entries, null, 2);
        }

        // CSV format
        const headers = ['Entry ID', 'Operation', 'Performed By', 'Timestamp', 'Details'];
        const rows = entries.map(entry => [
            entry.id,
            entry.operation,
            entry.performedBy,
            entry.timestamp.toISOString(),
            JSON.stringify(entry.details)
        ]);

        const csvLines = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ];

        return csvLines.join('\n');
    }

    /**
     * Get production statistics
     */
    getProductionStats(productionSetId: string): {
        totalOperations: number;
        operationsByType: Record<string, number>;
        lastOperation?: ProductionHistoryEntry;
        createdAt?: Date;
        exportedAt?: Date;
    } {
        const entries = this.getProductionHistory(productionSetId);

        const operationsByType: Record<string, number> = {};
        let createdAt: Date | undefined;
        let exportedAt: Date | undefined;

        for (const entry of entries) {
            operationsByType[entry.operation] = (operationsByType[entry.operation] || 0) + 1;

            if (entry.operation === 'created') {
                createdAt = entry.timestamp;
            } else if (entry.operation === 'exported') {
                exportedAt = entry.timestamp;
            }
        }

        return {
            totalOperations: entries.length,
            operationsByType,
            lastOperation: entries[0],
            createdAt,
            exportedAt
        };
    }
}
