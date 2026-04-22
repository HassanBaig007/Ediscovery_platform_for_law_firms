// Enhanced Types for eDiscovery Platform Core Enhancement
// This file extends the existing types in types.ts with new interfaces for enhanced functionality

// Import existing types
import {
    UserRole,
    CaseStatus,
    CaseRole,
    PrivilegeStatus,
    RelevanceStatus,
    ProductionSetStatus,
    IUser,
    ICase,
    ICustodian,
    IDocument,
    IIssueTag,
    IProductionSet,
    IAuditLog,
    ISearchFilters,
    ISavedSearch
} from './types';

// Re-export commonly used types
export {
    UserRole,
    CaseStatus,
    CaseRole,
    PrivilegeStatus,
    RelevanceStatus,
    ProductionSetStatus,
    IUser,
    ICase,
    ICustodian,
    IDocument,
    IIssueTag,
    IProductionSet,
    IAuditLog,
    ISearchFilters,
    ISavedSearch
};

// ============================================
// Document Processing Types
// ============================================

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface DocumentMetadata {
    author?: string;
    createdDate?: Date;
    modifiedDate?: Date;
    pageCount?: number;
    subject?: string;
    keywords?: string[];
    customFields: Record<string, any>;
}

export interface ProcessedDocument {
    id: string;
    originalFilename: string;
    fileType: string;
    extractedText: string;
    metadata: DocumentMetadata;
    processingStatus: ProcessingStatus;
    error?: string;
}

export interface DocumentClassification {
    documentType: string;
    confidence: number;
    language?: string;
    hasPII: boolean;
    piiTypes?: string[];
}

export interface ExtractedText {
    content: string;
    metadata: {
        pageCount: number;
        wordCount: number;
        characterCount: number;
        language?: string;
        ocrConfidence?: number;
        processingMethod?: string;
    };
    sections?: {
        title: string;
        content: string;
        page: number;
    }[];
}

// ============================================
// Search Engine Types
// ============================================

export interface SearchQuery {
    text: string;
    filters?: ISearchFilters;
    page?: number;
    pageSize?: number;
}

export interface EnhancedSearchFilters extends ISearchFilters {
    dateRange?: { from?: string; to?: string };
    fileTypes?: string[];
    custodians?: string[];
    tags?: string[];
    searchInContent?: boolean;
    searchInMetadata?: boolean;
}

export interface SearchResults {
    documents: IDocument[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    highlights?: {
        [documentId: string]: string[];
    };
    facets?: {
        fileTypes: Array<{ type: string; count: number }>;
        custodians: Array<{ id: string; name: string; count: number }>;
        tags: Array<{ id: string; name: string; count: number }>;
        dateRanges: Array<{ range: string; count: number }>;
    };
}

export interface IndexableDocument {
    id: string;
    content: string;
    metadata: {
        filename: string;
        fileType: string;
        custodianId: string;
        custodianName: string;
        caseId: string;
        caseName: string;
        uploadedAt: Date;
        documentDate?: Date;
        privilegeStatus?: PrivilegeStatus;
        relevanceStatus?: RelevanceStatus;
        tags: string[];
    };
}

// ============================================
// Collaborative Review Types
// ============================================

export interface ReviewAssignment {
    id: string;
    reviewerId: string;
    documentId: string;
    assignedAt: Date;
    completedAt?: Date;
    status: 'assigned' | 'in_progress' | 'completed';
    priority?: 'low' | 'medium' | 'high' | 'critical';
    deadline?: Date;
}

export interface ReviewNote {
    id: string;
    documentId: string;
    reviewerId: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    mentions?: string[]; // User IDs mentioned in the note
    isResolved?: boolean;
}

export interface ReviewProgress {
    totalDocuments: number;
    reviewedDocuments: number;
    pendingDocuments: number;
    progressPercentage: number;
    averageTimePerDocument: number;
    reviewerStats: Array<{
        reviewerId: string;
        reviewerName: string;
        documentsReviewed: number;
        averageTime: number;
        accuracy?: number;
    }>;
}

export interface Tag {
    id: string;
    name: string;
    color: string;
    description?: string;
    caseId: string;
    createdAt: Date;
}

// ============================================
// Redaction & Privilege Log Types
// ============================================

export interface Redaction {
    id: string;
    documentId: string;
    position: { x: number; y: number; width: number; height: number };
    page: number;
    reason: string;
    appliedBy: string;
    appliedAt: Date;
    reviewedBy?: string;
    reviewedAt?: Date;
    isApproved?: boolean;
}

export interface ProductionDocument {
    id: string;
    originalDocumentId: string;
    batesNumber: string;
    isRedacted: boolean;
    redactions: Redaction[];
    filePath: string;
    generatedAt: Date;
    generatedBy: string;
}

export interface PrivilegeLogEntry {
    id: string;
    documentId: string;
    caseId: string;
    privilegeReason: string;
    description: string;
    loggedBy: string;
    loggedAt: Date;
    reviewedBy?: string;
    reviewedAt?: Date;
    status: 'pending' | 'approved' | 'rejected';
    notes?: string;
}

// ============================================
// Production Workflow Types
// ============================================

export interface ProductionConfig {
    name: string;
    caseId: string;
    documentIds: string[];
    numberingFormat: string;
    includeRedactions: boolean;
    outputFormat: 'pdf' | 'tiff' | 'native' | 'all';
    metadataFields: string[];
    deliveryMethod?: 'download' | 'email' | 'ftp';
    deliveryRecipient?: string;
}

export interface LoadFile {
    id: string;
    productionSetId: string;
    fileType: 'dat' | 'opt' | 'csv' | 'xml';
    filePath: string;
    recordCount: number;
    generatedAt: Date;
    checksum: string;
}

export interface ExportResult {
    success: boolean;
    productionSetId: string;
    documents: number;
    files: Array<{
        type: string;
        path: string;
        size: number;
        checksum: string;
    }>;
    errors?: string[];
    warnings?: string[];
    generatedAt: Date;
}

// ============================================
// Security & Compliance Types
// ============================================

export interface Credentials {
    email: string;
    password: string;
    token?: string; // For MFA
}

export interface AuthResult {
    success: boolean;
    user?: IUser;
    token?: string;
    refreshToken?: string;
    requiresMFA?: boolean;
    error?: string;
}

export interface Permission {
    resource: string;
    actions: string[];
}

export interface AuditFilters {
    userId?: string;
    resourceType?: string;
    resourceId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    ipAddress?: string;
    page?: number;
    limit?: number;
}

export interface AuditEntry {
    id: string;
    userId: string;
    resource: string;
    action: string;
    timestamp: Date;
    ipAddress: string;
    userAgent: string;
    details?: Record<string, any>;
}

// ============================================
// Component Interfaces from Design Document
// ============================================

export interface DocumentProcessor {
    processDocument(file: File): Promise<ProcessedDocument>;
    extractText(document: IDocument): Promise<ExtractedText>;
    classifyDocument(document: IDocument): Promise<DocumentClassification>;
}

export interface SearchEngine {
    indexDocument(document: IndexableDocument): Promise<void>;
    search(query: SearchQuery): Promise<SearchResults>;
    suggest(query: string): Promise<string[]>;
    deleteDocument(documentId: string): Promise<void>;
    updateDocument(documentId: string, updates: Partial<IndexableDocument>): Promise<void>;
}

export interface CollaborativeReview {
    assignDocuments(reviewerId: string, documentIds: string[]): Promise<void>;
    tagDocument(documentId: string, tag: Tag, reviewerId: string): Promise<void>;
    addNote(documentId: string, note: ReviewNote): Promise<void>;
    getReviewProgress(reviewSetId: string): Promise<ReviewProgress>;
    resolveConflict(documentId: string, resolution: any): Promise<void>;
}

export interface RedactionManager {
    applyRedaction(documentId: string, redaction: Redaction): Promise<void>;
    generateProductionVersion(documentId: string): Promise<ProductionDocument>;
    addToPrivilegeLog(entry: PrivilegeLogEntry): Promise<void>;
    getPrivilegeLog(caseId: string): Promise<PrivilegeLogEntry[]>;
    approveRedaction(redactionId: string, reviewerId: string): Promise<void>;
}

export interface ProductionWorkflow {
    createProductionSet(config: ProductionConfig): Promise<IProductionSet>;
    applyBatesNumbering(productionSetId: string): Promise<void>;
    generateLoadFiles(productionSetId: string): Promise<LoadFile[]>;
    exportProduction(productionSetId: string): Promise<ExportResult>;
    validateProduction(productionSetId: string): Promise<{ valid: boolean; errors: string[] }>;
}

export interface SecurityManager {
    authenticate(credentials: Credentials): Promise<AuthResult>;
    authorize(userId: string, resource: string, action: string): Promise<boolean>;
    logAccess(userId: string, resource: string, action: string): Promise<void>;
    getAuditTrail(filters: AuditFilters): Promise<AuditEntry[]>;
    enforceMFASetup(userId: string): Promise<void>;
    validatePassword(password: string): Promise<{ valid: boolean; errors: string[] }>;
}

// ============================================
// Error Types
// ============================================

export interface ProcessingError {
    code: string;
    message: string;
    documentId?: string;
    details?: Record<string, any>;
    timestamp: Date;
    retryable: boolean;
}

export interface SearchError {
    code: string;
    message: string;
    query?: string;
    details?: Record<string, any>;
    timestamp: Date;
}

export interface ReviewError {
    code: string;
    message: string;
    documentId?: string;
    reviewerId?: string;
    conflict?: any;
    timestamp: Date;
}

export interface ProductionError {
    code: string;
    message: string;
    productionSetId?: string;
    documentIds?: string[];
    details?: Record<string, any>;
    timestamp: Date;
}

export interface SecurityError {
    code: string;
    message: string;
    userId?: string;
    ipAddress?: string;
    action?: string;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================
// Event Types for Real-time Updates
// ============================================

export interface DocumentProcessingEvent {
    type: 'processing_started' | 'processing_completed' | 'processing_failed';
    documentId: string;
    timestamp: Date;
    details?: any;
}

export interface ReviewEvent {
    type: 'document_assigned' | 'document_reviewed' | 'note_added' | 'conflict_detected';
    documentId: string;
    reviewerId: string;
    timestamp: Date;
    details?: any;
}

export interface ProductionEvent {
    type: 'production_created' | 'production_approved' | 'production_exported' | 'production_failed';
    productionSetId: string;
    userId: string;
    timestamp: Date;
    details?: any;
}

export interface SecurityEvent {
    type: 'login' | 'logout' | 'access_denied' | 'password_changed' | 'mfa_enabled';
    userId: string;
    ipAddress: string;
    timestamp: Date;
    details?: any;
}