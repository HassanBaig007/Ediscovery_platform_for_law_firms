// Query Builder for Elasticsearch
// Parses user queries and builds Elasticsearch Query DSL

import { SearchQuery, EnhancedSearchFilters } from '../../../../shared/enhanced-types';

export interface ElasticsearchQuery {
    bool: {
        must?: any[];
        should?: any[];
        must_not?: any[];
        filter?: any[];
    };
}

export class QueryBuilder {
    private readonly indexName: string = 'documents';

    /**
     * Build Elasticsearch query from search query
     */
    buildQuery(query: SearchQuery): any {
        const esQuery: any = {
            bool: {
                must: [],
                filter: []
            }
        };

        // Parse text query for Boolean operators
        if (query.text && query.text.trim()) {
            const parsedQuery = this.parseTextQuery(query.text);
            esQuery.bool.must.push(parsedQuery);
        }

        // Apply filters
        if (query.filters) {
            const filterClauses = this.buildFilters(query.filters as EnhancedSearchFilters);
            esQuery.bool.filter.push(...filterClauses);
        }

        return esQuery;
    }

    /**
     * Parse text query with Boolean operators
     * Supports: AND, OR, NOT, phrase searching with quotes
     */
    private parseTextQuery(text: string): any {
        // Handle phrase searching (text in quotes)
        const phraseRegex = /"([^"]+)"/g;
        const phrases: string[] = [];
        let textWithoutPhrases = text;

        let match;
        while ((match = phraseRegex.exec(text)) !== null) {
            phrases.push(match[1]);
            textWithoutPhrases = textWithoutPhrases.replace(match[0], '');
        }

        // Split remaining text by Boolean operators
        const tokens = textWithoutPhrases.split(/\s+(AND|OR|NOT)\s+/i);
        
        // Simple case: no Boolean operators
        if (tokens.length === 1 && phrases.length === 0) {
            return {
                multi_match: {
                    query: text.trim(),
                    fields: ['content^2', 'metadata.filename', 'metadata.caseName'],
                    type: 'best_fields',
                    operator: 'and'
                }
            };
        }

        // Complex case: parse Boolean operators
        const boolQuery: any = {
            bool: {
                must: [],
                should: [],
                must_not: []
            }
        };

        // Add phrase searches
        phrases.forEach(phrase => {
            boolQuery.bool.must.push({
                multi_match: {
                    query: phrase,
                    fields: ['content^2', 'metadata.filename'],
                    type: 'phrase'
                }
            });
        });

        // Parse tokens with operators
        let currentOperator = 'AND';
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i].trim();
            
            if (!token) continue;
            
            if (token.toUpperCase() === 'AND' || token.toUpperCase() === 'OR' || token.toUpperCase() === 'NOT') {
                currentOperator = token.toUpperCase();
                continue;
            }

            const matchQuery = {
                multi_match: {
                    query: token,
                    fields: ['content^2', 'metadata.filename', 'metadata.caseName'],
                    type: 'best_fields'
                }
            };

            if (currentOperator === 'AND') {
                boolQuery.bool.must.push(matchQuery);
            } else if (currentOperator === 'OR') {
                boolQuery.bool.should.push(matchQuery);
            } else if (currentOperator === 'NOT') {
                boolQuery.bool.must_not.push(matchQuery);
            }
        }

        // If only should clauses, require at least one match
        if (boolQuery.bool.should.length > 0 && boolQuery.bool.must.length === 0) {
            boolQuery.bool.minimum_should_match = 1;
        }

        return boolQuery;
    }

    /**
     * Build filter clauses from search filters
     */
    private buildFilters(filters: EnhancedSearchFilters): any[] {
        const filterClauses: any[] = [];

        // Case ID filter (required)
        if (filters.caseId) {
            filterClauses.push({
                term: { 'metadata.caseId': filters.caseId }
            });
        }

        // Date range filter
        if (filters.dateRange) {
            const dateFilter: any = {
                range: {
                    'metadata.documentDate': {}
                }
            };

            if (filters.dateRange.from) {
                dateFilter.range['metadata.documentDate'].gte = filters.dateRange.from;
            }

            if (filters.dateRange.to) {
                dateFilter.range['metadata.documentDate'].lte = filters.dateRange.to;
            }

            filterClauses.push(dateFilter);
        }

        // File type filter
        if (filters.fileTypes && filters.fileTypes.length > 0) {
            filterClauses.push({
                terms: { 'metadata.fileType': filters.fileTypes }
            });
        }

        // Custodian filter
        if (filters.custodianIds && filters.custodianIds.length > 0) {
            filterClauses.push({
                terms: { 'metadata.custodianId': filters.custodianIds }
            });
        }

        // Tag filter
        if (filters.issueTagIds && filters.issueTagIds.length > 0) {
            filterClauses.push({
                terms: { 'metadata.tags': filters.issueTagIds }
            });
        }

        // Privilege status filter
        if (filters.privilegeStatuses && filters.privilegeStatuses.length > 0) {
            filterClauses.push({
                terms: { 'metadata.privilegeStatus': filters.privilegeStatuses }
            });
        }

        // Relevance status filter
        if (filters.relevanceStatuses && filters.relevanceStatuses.length > 0) {
            filterClauses.push({
                terms: { 'metadata.relevanceStatus': filters.relevanceStatuses }
            });
        }

        return filterClauses;
    }

    /**
     * Build aggregations for faceted search
     */
    buildAggregations(): any {
        return {
            fileTypes: {
                terms: {
                    field: 'metadata.fileType',
                    size: 20
                }
            },
            custodians: {
                terms: {
                    field: 'metadata.custodianId',
                    size: 50
                }
            },
            tags: {
                terms: {
                    field: 'metadata.tags',
                    size: 100
                }
            },
            dateRanges: {
                date_histogram: {
                    field: 'metadata.documentDate',
                    calendar_interval: 'month'
                }
            }
        };
    }

    /**
     * Build highlight configuration
     */
    buildHighlight(): any {
        return {
            fields: {
                content: {
                    fragment_size: 150,
                    number_of_fragments: 3,
                    pre_tags: ['<mark>'],
                    post_tags: ['</mark>']
                },
                'metadata.filename': {
                    fragment_size: 100,
                    number_of_fragments: 1,
                    pre_tags: ['<mark>'],
                    post_tags: ['</mark>']
                }
            }
        };
    }

    /**
     * Get index name
     */
    getIndexName(): string {
        return this.indexName;
    }
}
