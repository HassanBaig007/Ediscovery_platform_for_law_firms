// Index Manager for Elasticsearch
// Manages index creation, mapping, and document indexing

import { Client } from '@elastic/elasticsearch';
import { IndexableDocument } from '../../../../shared/enhanced-types';

export interface IndexMapping {
    properties: Record<string, any>;
}

export class IndexManager {
    private client: Client;
    private indexName: string;

    constructor(client: Client, indexName = 'ediscovery-documents') {
        this.client = client;
        this.indexName = indexName;
    }

    /**
     * Create index with appropriate mappings
     */
    async createIndex(): Promise<void> {
        const exists = await this.client.indices.exists({ index: this.indexName });

        if (exists) {
            return;
        }

        const mapping: IndexMapping = {
            properties: {
                id: { type: 'keyword' },
                content: {
                    type: 'text',
                    analyzer: 'standard',
                    fields: {
                        keyword: { type: 'keyword' }
                    }
                },
                metadata: {
                    properties: {
                        filename: {
                            type: 'text',
                            fields: {
                                keyword: { type: 'keyword' }
                            }
                        },
                        fileType: { type: 'keyword' },
                        custodianId: { type: 'keyword' },
                        custodianName: {
                            type: 'text',
                            fields: {
                                keyword: { type: 'keyword' }
                            }
                        },
                        caseId: { type: 'keyword' },
                        caseName: {
                            type: 'text',
                            fields: {
                                keyword: { type: 'keyword' }
                            }
                        },
                        uploadedAt: { type: 'date' },
                        documentDate: { type: 'date' },
                        privilegeStatus: { type: 'keyword' },
                        relevanceStatus: { type: 'keyword' },
                        tags: { type: 'keyword' }
                    }
                }
            }
        };

        await this.client.indices.create({
            index: this.indexName,
            body: {
                settings: {
                    number_of_shards: 3,
                    number_of_replicas: 1,
                    analysis: {
                        analyzer: {
                            standard: {
                                type: 'standard',
                                stopwords: '_english_'
                            }
                        }
                    }
                },
                mappings: mapping
            }
        });
    }

    /**
     * Delete index
     */
    async deleteIndex(): Promise<void> {
        const exists = await this.client.indices.exists({ index: this.indexName });

        if (!exists) {
            return;
        }

        await this.client.indices.delete({ index: this.indexName });
    }

    /**
     * Index a document
     */
    async indexDocument(document: IndexableDocument): Promise<void> {
        await this.client.index({
            index: this.indexName,
            id: document.id,
            body: document
        });

        // Refresh index to make document searchable immediately (for testing)
        await this.client.indices.refresh({ index: this.indexName });
    }

    /**
     * Update a document
     */
    async updateDocument(documentId: string, updates: Partial<IndexableDocument>): Promise<void> {
        await this.client.update({
            index: this.indexName,
            id: documentId,
            body: {
                doc: updates
            }
        });
    }

    /**
     * Delete a document
     */
    async deleteDocument(documentId: string): Promise<void> {
        await this.client.delete({
            index: this.indexName,
            id: documentId
        });
    }

    /**
     * Bulk index documents
     */
    async bulkIndexDocuments(documents: IndexableDocument[]): Promise<void> {
        const body = documents.flatMap(doc => [
            { index: { _index: this.indexName, _id: doc.id } },
            doc
        ]);

        await this.client.bulk({ body });
        await this.client.indices.refresh({ index: this.indexName });
    }

    /**
     * Get index statistics
     */
    async getIndexStats() {
        return await this.client.indices.stats({ index: this.indexName });
    }

    /**
     * Get document count
     */
    async getDocumentCount(): Promise<number> {
        const result = await this.client.count({ index: this.indexName });
        return result.count;
    }

    /**
     * Check if index exists
     */
    async indexExists(): Promise<boolean> {
        return await this.client.indices.exists({ index: this.indexName });
    }

    /**
     * Get index name
     */
    getIndexName(): string {
        return this.indexName;
    }
}
