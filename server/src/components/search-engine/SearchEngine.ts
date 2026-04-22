// Search Engine Implementation
// Main search engine class that implements the SearchEngine interface

import { Client } from '@elastic/elasticsearch';
import {
    SearchEngine as ISearchEngine,
    SearchQuery,
    SearchResults,
    IndexableDocument,
    IDocument
} from '../../../../shared/enhanced-types';
import { IndexManager } from './IndexManager';
import { QueryBuilder } from './QueryBuilder';

export class SearchEngine implements ISearchEngine {
    private client: Client;
    private indexManager: IndexManager;
    private queryBuilder: QueryBuilder;

    constructor(client: Client, indexName = 'ediscovery-documents') {
        this.client = client;
        this.indexManager = new IndexManager(client, indexName);
        this.queryBuilder = new QueryBuilder();
    }

    /**
     * Initialize the search engine
     */
    async initialize(): Promise<void> {
        await this.indexManager.createIndex();
    }

    /**
     * Index a document for searching
     */
    async indexDocument(document: IndexableDocument): Promise<void> {
        await this.indexManager.indexDocument(document);
    }

    /**
     * Search for documents
     */
    async search(query: SearchQuery): Promise<SearchResults> {
        const page = query.page || 1;
        const pageSize = query.pageSize || 20;
        const from = (page - 1) * pageSize;

        const esQuery = this.queryBuilder.buildQuery(query);
        const aggregations = this.queryBuilder.buildAggregations();
        const highlight = this.queryBuilder.buildHighlight();

        const response = await this.client.search({
            index: this.indexManager.getIndexName(),
            body: {
                query: esQuery,
                from,
                size: pageSize,
                aggs: aggregations,
                highlight,
                sort: [
                    { _score: { order: 'desc' } },
                    { 'metadata.documentDate': { order: 'desc' } }
                ]
            }
        });

        // Extract documents from hits
        const documents: IDocument[] = response.hits.hits.map((hit: any) => {
            const source = hit._source;
            return {
                id: source.id,
                caseId: source.metadata.caseId,
                custodianId: source.metadata.custodianId,
                docNumber: source.id,
                filename: source.metadata.filename,
                fileType: source.metadata.fileType,
                fileSize: 0, // Not stored in index
                filePath: '', // Not stored in index
                md5Hash: '', // Not stored in index
                documentDate: source.metadata.documentDate,
                uploadedBy: '', // Not stored in index
                uploadedAt: source.metadata.uploadedAt,
                isDuplicate: false,
                extractedText: source.content,
                coding: {
                    privilegeStatus: source.metadata.privilegeStatus,
                    relevanceStatus: source.metadata.relevanceStatus,
                    isConfidential: false
                },
                tags: source.metadata.tags || [],
                createdAt: source.metadata.uploadedAt,
                updatedAt: source.metadata.uploadedAt
            };
        });

        // Extract highlights
        const highlights: { [documentId: string]: string[] } = {};
        response.hits.hits.forEach((hit: any) => {
            if (hit.highlight) {
                const documentId = hit._source.id;
                highlights[documentId] = [];
                
                if (hit.highlight.content) {
                    highlights[documentId].push(...hit.highlight.content);
                }
                
                if (hit.highlight['metadata.filename']) {
                    highlights[documentId].push(...hit.highlight['metadata.filename']);
                }
            }
        });

        // Extract facets from aggregations
        const facets = this.extractFacets(response.aggregations);

        const total = typeof response.hits.total === 'number' 
            ? response.hits.total 
            : response.hits.total?.value || 0;

        return {
            documents,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
            highlights,
            facets
        };
    }

    /**
     * Get search suggestions (autocomplete)
     */
    async suggest(query: string): Promise<string[]> {
        if (!query || query.length < 2) {
            return [];
        }

        const response = await this.client.search({
            index: this.indexManager.getIndexName(),
            body: {
                size: 0,
                aggs: {
                    suggestions: {
                        terms: {
                            field: 'metadata.filename.keyword',
                            include: `.*${query}.*`,
                            size: 10
                        }
                    }
                }
            }
        });

        if (!response.aggregations?.suggestions) {
            return [];
        }

        const buckets = (response.aggregations.suggestions as any).buckets || [];
        return buckets.map((bucket: any) => bucket.key);
    }

    /**
     * Delete a document from the index
     */
    async deleteDocument(documentId: string): Promise<void> {
        await this.indexManager.deleteDocument(documentId);
    }

    /**
     * Update a document in the index
     */
    async updateDocument(documentId: string, updates: Partial<IndexableDocument>): Promise<void> {
        await this.indexManager.updateDocument(documentId, updates);
    }

    /**
     * Extract facets from Elasticsearch aggregations
     */
    private extractFacets(aggregations: any): SearchResults['facets'] {
        if (!aggregations) {
            return undefined;
        }

        const facets: any = {};

        // File types facet
        if (aggregations.fileTypes?.buckets) {
            facets.fileTypes = aggregations.fileTypes.buckets.map((bucket: any) => ({
                type: bucket.key,
                count: bucket.doc_count
            }));
        }

        // Custodians facet
        if (aggregations.custodians?.buckets) {
            facets.custodians = aggregations.custodians.buckets.map((bucket: any) => ({
                id: bucket.key,
                name: bucket.key, // Would need to lookup actual name
                count: bucket.doc_count
            }));
        }

        // Tags facet
        if (aggregations.tags?.buckets) {
            facets.tags = aggregations.tags.buckets.map((bucket: any) => ({
                id: bucket.key,
                name: bucket.key, // Would need to lookup actual name
                count: bucket.doc_count
            }));
        }

        // Date ranges facet
        if (aggregations.dateRanges?.buckets) {
            facets.dateRanges = aggregations.dateRanges.buckets.map((bucket: any) => ({
                range: bucket.key_as_string || bucket.key,
                count: bucket.doc_count
            }));
        }

        return facets;
    }

    /**
     * Get search statistics
     */
    async getSearchStats() {
        return await this.indexManager.getIndexStats();
    }

    /**
     * Get document count
     */
    async getDocumentCount(): Promise<number> {
        return await this.indexManager.getDocumentCount();
    }
}
