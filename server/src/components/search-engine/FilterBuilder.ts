// Filter Builder for Search Queries
// Validates and builds filter clauses for Elasticsearch queries

import { EnhancedSearchFilters } from '../../../../shared/enhanced-types';
import { PrivilegeStatus, RelevanceStatus } from '../../../../shared/types';

export interface FilterValidationResult {
    isValid: boolean;
    errors: string[];
}

export class FilterBuilder {
    private config = {
        fragmentSize: 150,
        numberOfFragments: 3,
        preTag: '<mark>',
        postTag: '</mark>'
    };

    /**
     * Validate search filters
     */
    validateFilters(filters: EnhancedSearchFilters): FilterValidationResult {
        const errors: string[] = [];

        // Validate case ID (required)
        if (!filters.caseId || typeof filters.caseId !== 'string') {
            errors.push('Case ID is required and must be a string');
        }

        // Validate date range
        if (filters.dateRange) {
            if (filters.dateRange.from && filters.dateRange.to) {
                const fromDate = new Date(filters.dateRange.from);
                const toDate = new Date(filters.dateRange.to);
                
                if (isNaN(fromDate.getTime())) {
                    errors.push('Invalid "from" date in date range');
                }
                
                if (isNaN(toDate.getTime())) {
                    errors.push('Invalid "to" date in date range');
                }
                
                if (fromDate > toDate) {
                    errors.push('Date range "from" must be before "to"');
                }
            }
        }

        // Validate file types
        if (filters.fileTypes && !Array.isArray(filters.fileTypes)) {
            errors.push('File types must be an array');
        }

        // Validate custodian IDs
        if (filters.custodianIds && !Array.isArray(filters.custodianIds)) {
            errors.push('Custodian IDs must be an array');
        }

        // Validate privilege statuses
        if (filters.privilegeStatuses) {
            if (!Array.isArray(filters.privilegeStatuses)) {
                errors.push('Privilege statuses must be an array');
            } else {
                const validStatuses: PrivilegeStatus[] = [
                    'NOT_PRIVILEGED',
                    'ATTORNEY_CLIENT',
                    'WORK_PRODUCT',
                    'NEEDS_REVIEW'
                ];
                
                const invalidStatuses = filters.privilegeStatuses.filter(
                    status => !validStatuses.includes(status)
                );
                
                if (invalidStatuses.length > 0) {
                    errors.push(`Invalid privilege statuses: ${invalidStatuses.join(', ')}`);
                }
            }
        }

        // Validate relevance statuses
        if (filters.relevanceStatuses) {
            if (!Array.isArray(filters.relevanceStatuses)) {
                errors.push('Relevance statuses must be an array');
            } else {
                const validStatuses: RelevanceStatus[] = [
                    'HIGHLY_RELEVANT',
                    'RELEVANT',
                    'NOT_RELEVANT',
                    'MARGINAL'
                ];
                
                const invalidStatuses = filters.relevanceStatuses.filter(
                    status => !validStatuses.includes(status)
                );
                
                if (invalidStatuses.length > 0) {
                    errors.push(`Invalid relevance statuses: ${invalidStatuses.join(', ')}`);
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Build Elasticsearch filter clauses
     */
    buildFilterClauses(filters: EnhancedSearchFilters): any[] {
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

        // Duplicate filter
        if (filters.isDuplicate !== undefined) {
            filterClauses.push({
                term: { 'metadata.isDuplicate': filters.isDuplicate }
            });
        }

        return filterClauses;
    }

    /**
     * Combine multiple filter sets with AND logic
     */
    combineFilters(filterSets: EnhancedSearchFilters[]): EnhancedSearchFilters {
        if (filterSets.length === 0) {
            throw new Error('At least one filter set is required');
        }

        if (filterSets.length === 1) {
            return filterSets[0];
        }

        // Start with first filter set
        const combined: EnhancedSearchFilters = { ...filterSets[0] };

        // Merge remaining filter sets
        for (let i = 1; i < filterSets.length; i++) {
            const filters = filterSets[i];

            // Combine arrays (intersection)
            if (filters.fileTypes) {
                combined.fileTypes = combined.fileTypes
                    ? combined.fileTypes.filter(ft => filters.fileTypes?.includes(ft))
                    : filters.fileTypes;
            }

            if (filters.custodianIds) {
                combined.custodianIds = combined.custodianIds
                    ? combined.custodianIds.filter(id => filters.custodianIds?.includes(id))
                    : filters.custodianIds;
            }

            if (filters.issueTagIds) {
                combined.issueTagIds = combined.issueTagIds
                    ? combined.issueTagIds.filter(id => filters.issueTagIds?.includes(id))
                    : filters.issueTagIds;
            }

            // Combine date ranges (intersection)
            if (filters.dateRange) {
                if (!combined.dateRange) {
                    combined.dateRange = filters.dateRange;
                } else {
                    // Take the most restrictive date range
                    const fromDate1 = combined.dateRange.from ? new Date(combined.dateRange.from) : null;
                    const fromDate2 = filters.dateRange.from ? new Date(filters.dateRange.from) : null;
                    const toDate1 = combined.dateRange.to ? new Date(combined.dateRange.to) : null;
                    const toDate2 = filters.dateRange.to ? new Date(filters.dateRange.to) : null;

                    if (fromDate1 && fromDate2) {
                        combined.dateRange.from = fromDate1 > fromDate2 
                            ? combined.dateRange.from 
                            : filters.dateRange.from;
                    } else if (fromDate2) {
                        combined.dateRange.from = filters.dateRange.from;
                    }

                    if (toDate1 && toDate2) {
                        combined.dateRange.to = toDate1 < toDate2 
                            ? combined.dateRange.to 
                            : filters.dateRange.to;
                    } else if (toDate2) {
                        combined.dateRange.to = filters.dateRange.to;
                    }
                }
            }
        }

        return combined;
    }

    /**
     * Get highlight configuration for Elasticsearch
     */
    getElasticsearchHighlightConfig(): any {
        return {
            fields: {
                content: {
                    fragment_size: this.config.fragmentSize,
                    number_of_fragments: this.config.numberOfFragments,
                    pre_tags: [this.config.preTag],
                    post_tags: [this.config.postTag]
                },
                'metadata.filename': {
                    fragment_size: 100,
                    number_of_fragments: 1,
                    pre_tags: [this.config.preTag],
                    post_tags: [this.config.postTag]
                }
            }
        };
    }

    /**
     * Strip HTML tags from highlighted text
     */
    stripHighlightTags(text: string): string {
        return text.replace(new RegExp(this.escapeRegex(this.config.preTag), 'g'), '')
                   .replace(new RegExp(this.escapeRegex(this.config.postTag), 'g'), '');
    }

    /**
     * Escape special regex characters
     */
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
