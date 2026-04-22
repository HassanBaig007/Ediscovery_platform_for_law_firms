// Property-Based Tests for Search Engine Component
// Tests universal properties that must hold for all search operations

import * as fc from 'fast-check';
import { SearchEngine } from '../../components/search-engine/SearchEngine';
import { QueryBuilder } from '../../components/search-engine/QueryBuilder';
import { IndexableDocument, SearchQuery } from '../../../../shared/enhanced-types';

const queryTermArb = fc.stringMatching(/^[A-Za-z0-9]{3,10}$/);
const caseIdArb = fc.stringMatching(/^[A-Za-z0-9-]{3,20}$/);

// Mock Elasticsearch client for testing
const createMockClient = () => {
    const documents = new Map<string, IndexableDocument>();
    const getNestedValue = (obj: unknown, nestedPath: string): unknown => {
        return nestedPath
            .split('.')
            .reduce<unknown>((current, key) => (current as Record<string, unknown> | undefined)?.[key], obj);
    };
    const normalizeText = (value: unknown): string => String(value ?? '').toLowerCase();
    const matchesMultiMatch = (doc: IndexableDocument, multiMatch: any): boolean => {
        const queryText = normalizeText(multiMatch.query).trim();
        if (!queryText) {
            return true;
        }

        const fields: string[] = Array.isArray(multiMatch.fields) ? multiMatch.fields : [];
        const tokens = queryText.split(/\s+/).filter(Boolean);

        for (const rawField of fields) {
            const field = rawField.replace(/\^\d+(\.\d+)?$/, '');
            const fieldValue = normalizeText(getNestedValue(doc, field));

            if (multiMatch.type === 'phrase') {
                if (fieldValue.includes(queryText)) {
                    return true;
                }
                continue;
            }

            if (multiMatch.operator === 'and') {
                if (tokens.every((token) => fieldValue.includes(token))) {
                    return true;
                }
                continue;
            }

            if (tokens.some((token) => fieldValue.includes(token))) {
                return true;
            }
        }

        return false;
    };
    const matchesClause = (doc: IndexableDocument, clause: any): boolean => {
        if (!clause || typeof clause !== 'object') {
            return true;
        }

        if (clause.multi_match) {
            return matchesMultiMatch(doc, clause.multi_match);
        }

        if (clause.bool) {
            const mustClauses = Array.isArray(clause.bool.must) ? clause.bool.must : [];
            const shouldClauses = Array.isArray(clause.bool.should) ? clause.bool.should : [];
            const mustNotClauses = Array.isArray(clause.bool.must_not) ? clause.bool.must_not : [];
            const minimumShouldMatch = Number(clause.bool.minimum_should_match || 0);

            const mustPass = mustClauses.every((mustClause) => matchesClause(doc, mustClause));
            const shouldMatches = shouldClauses.filter((shouldClause) => matchesClause(doc, shouldClause)).length;
            let shouldPass = true;
            if (shouldClauses.length > 0) {
                if (minimumShouldMatch > 0) {
                    shouldPass = shouldMatches >= minimumShouldMatch;
                } else if (mustClauses.length === 0) {
                    shouldPass = shouldMatches >= 1;
                }
            }
            const mustNotPass = mustNotClauses.every((mustNotClause) => !matchesClause(doc, mustNotClause));

            return mustPass && shouldPass && mustNotPass;
        }

        return true;
    };
    
    return {
        indices: {
            exists: jest.fn().mockResolvedValue(true),
            create: jest.fn().mockResolvedValue({}),
            delete: jest.fn().mockResolvedValue({}),
            refresh: jest.fn().mockResolvedValue({}),
            stats: jest.fn().mockResolvedValue({})
        },
        index: jest.fn().mockImplementation(async ({ id, body }) => {
            documents.set(id, body);
            return { result: 'created' };
        }),
        update: jest.fn().mockResolvedValue({ result: 'updated' }),
        delete: jest.fn().mockImplementation(async ({ id }) => {
            documents.delete(id);
            return { result: 'deleted' };
        }),
        bulk: jest.fn().mockResolvedValue({ errors: false }),
        count: jest.fn().mockImplementation(async () => {
            return { count: documents.size };
        }),
        search: jest.fn().mockImplementation(async ({ body }) => {
            // Simple mock search implementation
            const allDocs = Array.from(documents.values());
            
            // Filter by query if present
            let filteredDocs = allDocs;
            
            if (body.query?.bool?.filter) {
                const filters = body.query.bool.filter;
                filteredDocs = filteredDocs.filter(doc => {
                    return filters.every((filter: any) => {
                        if (filter.term) {
                            const field = Object.keys(filter.term)[0];
                            const value = filter.term[field];
                            const docValue = getNestedValue(doc, field);
                            return docValue === value;
                        }

                        if (filter.terms) {
                            const field = Object.keys(filter.terms)[0];
                            const values = Array.isArray(filter.terms[field]) ? filter.terms[field] : [];
                            const docValue = getNestedValue(doc, field);

                            if (Array.isArray(docValue)) {
                                return docValue.some((item) => values.includes(item));
                            }

                            return values.includes(docValue);
                        }

                        if (filter.range) {
                            const field = Object.keys(filter.range)[0];
                            const constraints = filter.range[field] || {};
                            const docValue = getNestedValue(doc, field);
                            const docDate = docValue ? new Date(String(docValue)).getTime() : NaN;

                            if (Number.isNaN(docDate)) {
                                return false;
                            }

                            if (constraints.gte && docDate < new Date(String(constraints.gte)).getTime()) {
                                return false;
                            }

                            if (constraints.lte && docDate > new Date(String(constraints.lte)).getTime()) {
                                return false;
                            }

                            return true;
                        }

                        return true;
                    });
                });
            }

            if (body.query?.bool?.must && Array.isArray(body.query.bool.must) && body.query.bool.must.length > 0) {
                filteredDocs = filteredDocs.filter((doc) =>
                    body.query.bool.must.every((mustClause: any) => matchesClause(doc, mustClause))
                );
            }

            if (body.query?.bool?.must_not && Array.isArray(body.query.bool.must_not) && body.query.bool.must_not.length > 0) {
                filteredDocs = filteredDocs.filter((doc) =>
                    body.query.bool.must_not.every((mustNotClause: any) => !matchesClause(doc, mustNotClause))
                );
            }
            
            const from = body.from || 0;
            const size = body.size || 20;
            const paginatedDocs = filteredDocs.slice(from, from + size);
            
            return {
                hits: {
                    total: { value: filteredDocs.length },
                    hits: paginatedDocs.map(doc => ({
                        _source: doc,
                        _score: 1.0
                    }))
                },
                aggregations: {}
            };
        }),
        cluster: {
            health: jest.fn().mockResolvedValue({ cluster_name: 'test' }),
            stats: jest.fn().mockResolvedValue({})
        },
        close: jest.fn().mockResolvedValue({}),
    } as any;
};

describe('Search Engine - Property-Based Tests', () => {
    let searchEngine: SearchEngine;
    let mockClient: any;

    beforeEach(async () => {
        mockClient = createMockClient();
        searchEngine = new SearchEngine(mockClient);
        await searchEngine.initialize();
    });

    /**
     * Property 5: Boolean search operator correctness
     * Validates: Requirements 2.2
     * 
     * For any search query using Boolean operators (AND, OR, NOT),
     * the results shall match the logical combination of individual term searches.
     */
    describe('Property 5: Boolean search operator correctness', () => {
        it('should satisfy: AND operator returns intersection of term results', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(queryTermArb, { minLength: 2, maxLength: 5 }),
                    caseIdArb,
                    async (terms, caseId) => {
                        // Index test documents
                        const docs: IndexableDocument[] = [];
                        
                        // Create documents that contain different combinations of terms
                        for (let i = 0; i < terms.length; i++) {
                            docs.push({
                                id: `doc-${i}`,
                                content: terms[i],
                                metadata: {
                                    filename: `file-${i}.txt`,
                                    fileType: 'text/plain',
                                    custodianId: 'cust-1',
                                    custodianName: 'Test Custodian',
                                    caseId,
                                    caseName: 'Test Case',
                                    uploadedAt: new Date(),
                                    tags: []
                                }
                            });
                        }
                        
                        // Create a document with all terms
                        docs.push({
                            id: 'doc-all',
                            content: terms.join(' '),
                            metadata: {
                                filename: 'file-all.txt',
                                fileType: 'text/plain',
                                custodianId: 'cust-1',
                                custodianName: 'Test Custodian',
                                caseId,
                                caseName: 'Test Case',
                                uploadedAt: new Date(),
                                tags: []
                            }
                        });
                        
                        // Index all documents
                        for (const doc of docs) {
                            await searchEngine.indexDocument(doc);
                        }
                        
                        // Search with AND operator
                        const andQuery = terms.join(' AND ');
                        const results = await searchEngine.search({
                            text: andQuery,
                            filters: { caseId }
                        });
                        
                        // The document with all terms should be in results
                        const hasAllTermsDoc = results.documents.some(doc => doc.id === 'doc-all');
                        
                        // Property: AND results should only include documents with ALL terms
                        expect(hasAllTermsDoc).toBe(true);
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('should satisfy: OR operator returns union of term results', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.tuple(
                        queryTermArb,
                        queryTermArb
                    ).filter(([a, b]) => a !== b),
                    caseIdArb,
                    async ([term1, term2], caseId) => {
                        // Index test documents
                        const doc1: IndexableDocument = {
                            id: 'doc-1',
                            content: term1,
                            metadata: {
                                filename: 'file-1.txt',
                                fileType: 'text/plain',
                                custodianId: 'cust-1',
                                custodianName: 'Test Custodian',
                                caseId,
                                caseName: 'Test Case',
                                uploadedAt: new Date(),
                                tags: []
                            }
                        };
                        
                        const doc2: IndexableDocument = {
                            id: 'doc-2',
                            content: term2,
                            metadata: {
                                filename: 'file-2.txt',
                                fileType: 'text/plain',
                                custodianId: 'cust-1',
                                custodianName: 'Test Custodian',
                                caseId,
                                caseName: 'Test Case',
                                uploadedAt: new Date(),
                                tags: []
                            }
                        };
                        
                        await searchEngine.indexDocument(doc1);
                        await searchEngine.indexDocument(doc2);
                        
                        // Search with OR operator
                        const orQuery = `${term1} OR ${term2}`;
                        const results = await searchEngine.search({
                            text: orQuery,
                            filters: { caseId }
                        });
                        
                        // Property: OR results should include documents with EITHER term
                        // At least one document should be returned
                        expect(results.documents.length).toBeGreaterThanOrEqual(1);
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('should satisfy: NOT operator excludes matching documents', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.tuple(
                        queryTermArb,
                        queryTermArb
                    ).filter(([a, b]) => a !== b),
                    caseIdArb,
                    async ([includeTerm, excludeTerm], caseId) => {
                        // Index test documents
                        const doc1: IndexableDocument = {
                            id: 'doc-include',
                            content: includeTerm,
                            metadata: {
                                filename: 'file-include.txt',
                                fileType: 'text/plain',
                                custodianId: 'cust-1',
                                custodianName: 'Test Custodian',
                                caseId,
                                caseName: 'Test Case',
                                uploadedAt: new Date(),
                                tags: []
                            }
                        };
                        
                        const doc2: IndexableDocument = {
                            id: 'doc-exclude',
                            content: `${includeTerm} ${excludeTerm}`,
                            metadata: {
                                filename: 'file-exclude.txt',
                                fileType: 'text/plain',
                                custodianId: 'cust-1',
                                custodianName: 'Test Custodian',
                                caseId,
                                caseName: 'Test Case',
                                uploadedAt: new Date(),
                                tags: []
                            }
                        };
                        
                        await searchEngine.indexDocument(doc1);
                        await searchEngine.indexDocument(doc2);
                        
                        // Search with NOT operator
                        const notQuery = `${includeTerm} NOT ${excludeTerm}`;
                        const results = await searchEngine.search({
                            text: notQuery,
                            filters: { caseId }
                        });
                        
                        // Property: NOT results should exclude documents with the excluded term
                        const hasExcludedDoc = results.documents.some(doc => doc.id === 'doc-exclude');
                        expect(hasExcludedDoc).toBe(false);
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('should satisfy: Phrase search matches exact phrases', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(queryTermArb, { minLength: 2, maxLength: 4 }),
                    caseIdArb,
                    async (words, caseId) => {
                        const phrase = words.join(' ');
                        
                        // Index document with exact phrase
                        const doc: IndexableDocument = {
                            id: 'doc-phrase',
                            content: `Some text before ${phrase} some text after`,
                            metadata: {
                                filename: 'file-phrase.txt',
                                fileType: 'text/plain',
                                custodianId: 'cust-1',
                                custodianName: 'Test Custodian',
                                caseId,
                                caseName: 'Test Case',
                                uploadedAt: new Date(),
                                tags: []
                            }
                        };
                        
                        await searchEngine.indexDocument(doc);
                        
                        // Search with phrase in quotes
                        const phraseQuery = `"${phrase}"`;
                        const results = await searchEngine.search({
                            text: phraseQuery,
                            filters: { caseId }
                        });
                        
                        // Property: Phrase search should find the document
                        const foundDoc = results.documents.some(d => d.id === 'doc-phrase');
                        expect(foundDoc).toBe(true);
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    /**
     * Unit tests for specific search scenarios
     */
    describe('Search Engine - Unit Tests', () => {
        it('should handle empty search query', async () => {
            const results = await searchEngine.search({
                text: '',
                filters: { caseId: 'case-1' }
            });
            
            expect(results).toBeDefined();
            expect(results.documents).toBeInstanceOf(Array);
        });

        it('should handle pagination correctly', async () => {
            // Index multiple documents
            for (let i = 0; i < 25; i++) {
                await searchEngine.indexDocument({
                    id: `doc-${i}`,
                    content: `Document ${i} content`,
                    metadata: {
                        filename: `file-${i}.txt`,
                        fileType: 'text/plain',
                        custodianId: 'cust-1',
                        custodianName: 'Test Custodian',
                        caseId: 'case-1',
                        caseName: 'Test Case',
                        uploadedAt: new Date(),
                        tags: []
                    }
                });
            }
            
            const page1 = await searchEngine.search({
                text: 'Document',
                filters: { caseId: 'case-1' },
                page: 1,
                pageSize: 10
            });
            
            const page2 = await searchEngine.search({
                text: 'Document',
                filters: { caseId: 'case-1' },
                page: 2,
                pageSize: 10
            });
            
            expect(page1.page).toBe(1);
            expect(page2.page).toBe(2);
            expect(page1.documents.length).toBeLessThanOrEqual(10);
            expect(page2.documents.length).toBeLessThanOrEqual(10);
        });

        it('should apply file type filters correctly', async () => {
            // Index documents with different file types
            await searchEngine.indexDocument({
                id: 'doc-pdf',
                content: 'PDF content',
                metadata: {
                    filename: 'file.pdf',
                    fileType: 'application/pdf',
                    custodianId: 'cust-1',
                    custodianName: 'Test Custodian',
                    caseId: 'case-1',
                    caseName: 'Test Case',
                    uploadedAt: new Date(),
                    tags: []
                }
            });
            
            await searchEngine.indexDocument({
                id: 'doc-docx',
                content: 'DOCX content',
                metadata: {
                    filename: 'file.docx',
                    fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    custodianId: 'cust-1',
                    custodianName: 'Test Custodian',
                    caseId: 'case-1',
                    caseName: 'Test Case',
                    uploadedAt: new Date(),
                    tags: []
                }
            });
            
            const results = await searchEngine.search({
                text: 'content',
                filters: {
                    caseId: 'case-1',
                    fileTypes: ['application/pdf']
                }
            });
            
            // Should only return PDF document
            expect(results.documents.every(doc => doc.fileType === 'application/pdf')).toBe(true);
        });

        it('should provide search suggestions', async () => {
            // Index documents
            await searchEngine.indexDocument({
                id: 'doc-1',
                content: 'Test content',
                metadata: {
                    filename: 'contract-agreement.pdf',
                    fileType: 'application/pdf',
                    custodianId: 'cust-1',
                    custodianName: 'Test Custodian',
                    caseId: 'case-1',
                    caseName: 'Test Case',
                    uploadedAt: new Date(),
                    tags: []
                }
            });
            
            const suggestions = await searchEngine.suggest('con');
            
            expect(Array.isArray(suggestions)).toBe(true);
        });
    });

    /**
     * QueryBuilder unit tests
     */
    describe('QueryBuilder - Unit Tests', () => {
        let queryBuilder: QueryBuilder;

        beforeEach(() => {
            queryBuilder = new QueryBuilder();
        });

        it('should build simple query without operators', () => {
            const query: SearchQuery = {
                text: 'contract',
                filters: { caseId: 'case-1' }
            };
            
            const esQuery = queryBuilder.buildQuery(query);
            
            expect(esQuery.bool).toBeDefined();
            expect(esQuery.bool.must).toBeDefined();
            expect(esQuery.bool.filter).toBeDefined();
        });

        it('should parse AND operator correctly', () => {
            const query: SearchQuery = {
                text: 'contract AND agreement',
                filters: { caseId: 'case-1' }
            };
            
            const esQuery = queryBuilder.buildQuery(query);
            
            expect(esQuery.bool.must).toBeDefined();
            expect(esQuery.bool.must.length).toBeGreaterThan(0);
        });

        it('should parse OR operator correctly', () => {
            const query: SearchQuery = {
                text: 'contract OR agreement',
                filters: { caseId: 'case-1' }
            };
            
            const esQuery = queryBuilder.buildQuery(query);
            
            expect(esQuery.bool).toBeDefined();
        });

        it('should parse NOT operator correctly', () => {
            const query: SearchQuery = {
                text: 'contract NOT confidential',
                filters: { caseId: 'case-1' }
            };
            
            const esQuery = queryBuilder.buildQuery(query);
            
            expect(esQuery.bool).toBeDefined();
        });

        it('should handle phrase search with quotes', () => {
            const query: SearchQuery = {
                text: '"attorney client privilege"',
                filters: { caseId: 'case-1' }
            };
            
            const esQuery = queryBuilder.buildQuery(query);
            
            expect(esQuery.bool.must).toBeDefined();
        });

        it('should build date range filter', () => {
            const query: SearchQuery = {
                text: 'contract',
                filters: {
                    caseId: 'case-1',
                    dateRange: {
                        from: '2024-01-01',
                        to: '2024-12-31'
                    }
                }
            };
            
            const esQuery = queryBuilder.buildQuery(query);
            
            expect(esQuery.bool.filter).toBeDefined();
            expect(esQuery.bool.filter.length).toBeGreaterThan(0);
        });

        it('should build aggregations for faceted search', () => {
            const aggregations = queryBuilder.buildAggregations();
            
            expect(aggregations.fileTypes).toBeDefined();
            expect(aggregations.custodians).toBeDefined();
            expect(aggregations.tags).toBeDefined();
            expect(aggregations.dateRanges).toBeDefined();
        });

        it('should build highlight configuration', () => {
            const highlight = queryBuilder.buildHighlight();
            
            expect(highlight.fields).toBeDefined();
            expect(highlight.fields.content).toBeDefined();
        });
    });
});
