import {
    UserRole,
    CaseRole,
    PrivilegeStatus,
    RelevanceStatus,
    ProductionSetStatus,
    CaseStatus
} from './types';

// Role Display Labels
export const ROLE_LABELS: Record<UserRole, string> = {
    ADMIN: 'Administrator',
    PARTNER: 'Partner',
    ASSOCIATE: 'Associate',
    PARALEGAL: 'Paralegal'
};

// Case Role Labels
export const CASE_ROLE_LABELS: Record<CaseRole, string> = {
    LEAD: 'Lead Counsel',
    REVIEWER: 'Reviewer',
    PARALEGAL: 'Paralegal'
};

// Case Status Labels
export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
    ACTIVE: 'Active',
    CLOSED: 'Closed',
    ARCHIVED: 'Archived'
};

// Privilege Labels
export const PRIVILEGE_LABELS: Record<PrivilegeStatus, string> = {
    NOT_PRIVILEGED: 'Not Privileged',
    ATTORNEY_CLIENT: 'Attorney-Client',
    WORK_PRODUCT: 'Work Product',
    NEEDS_REVIEW: 'Needs Review'
};

// Relevance Labels
export const RELEVANCE_LABELS: Record<RelevanceStatus, string> = {
    HIGHLY_RELEVANT: 'Highly Relevant',
    RELEVANT: 'Relevant',
    MARGINAL: 'Marginal',
    NOT_RELEVANT: 'Not Relevant'
};

// Production State Labels
export const PRODUCTION_STATUS_LABELS: Record<ProductionSetStatus, string> = {
    DRAFT: 'Draft',
    IN_REVIEW: 'In Review',
    APPROVED: 'Approved',
    PRODUCED: 'Produced'
};

// Ingestion Stages Terminology
export const INGESTION_STAGES = {
    UPLOAD: 'Upload', // file transfer
    PROCESS: 'Process', // pipeline execution
    INGEST: 'Ingest' // system intake/availability
};

// Entity Display Labels
export const ENTITY_LABELS: Record<string, string> = {
    document: 'Document',
    case: 'Case',
    user: 'User',
    production: 'Production Set',
    custodian: 'Custodian',
    tag: 'Tag',
    review: 'Review Coding',
    audit: 'Audit Log'
};

// Audit Action Labels
export const AUDIT_ACTION_LABELS: Record<string, string> = {
    CREATE: 'Created',
    UPDATE: 'Updated',
    DELETE: 'Deleted',
    UPLOAD: 'Uploaded',
    DOWNLOAD: 'Downloaded',
    VIEW: 'Viewed',
    LOGIN: 'Logged In',
    LOGOUT: 'Logged Out',
    APPROVE: 'Approved',
    REJECT: 'Rejected',
    PRODUCE: 'Produced',
    EXPORT: 'Exported'
};
