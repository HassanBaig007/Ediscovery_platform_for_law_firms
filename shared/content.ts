import {
    CaseRole,
    CaseStatus,
    PrivilegeStatus,
    ProductionSetStatus,
    RelevanceStatus,
    UserRole
} from './types';

export interface RoleDisplayMeta {
    label: string;
    description: string;
}

export interface CaseRoleDisplayMeta {
    label: string;
    description: string;
}

export interface AuditActionMeta {
    label: string;
    pastTenseLabel: string;
    category: 'document' | 'case' | 'user' | 'production' | 'tag' | 'custodian' | 'system' | 'security' | 'portal' | 'billing' | 'integration' | 'other';
}

export const ROLE_DISPLAY: Record<UserRole, RoleDisplayMeta> = {
    ADMIN: {
        label: 'Administrator',
        description: 'Full system access for users, cases, and platform settings.'
    },
    PARTNER: {
        label: 'Partner',
        description: 'Oversees case strategy, quality, and production approval.'
    },
    ASSOCIATE: {
        label: 'Associate',
        description: 'Reviews and codes assigned documents.'
    },
    PARALEGAL: {
        label: 'Paralegal',
        description: 'Uploads, organizes, and tracks case materials.'
    }
};

export const CASE_ROLE_DISPLAY: Record<CaseRole, CaseRoleDisplayMeta> = {
    LEAD: {
        label: 'Lead',
        description: 'Owns case operations, team assignments, and metadata updates.'
    },
    REVIEWER: {
        label: 'Reviewer',
        description: 'Performs privilege and relevance coding.'
    },
    PARALEGAL: {
        label: 'Paralegal',
        description: 'Supports upload and organization tasks for the case.'
    }
};

export const PRIVILEGE_STATUS_DISPLAY: Record<PrivilegeStatus, string> = {
    NOT_PRIVILEGED: 'Not Privileged',
    ATTORNEY_CLIENT: 'Attorney-Client',
    WORK_PRODUCT: 'Work Product',
    NEEDS_REVIEW: 'Needs Review'
};

export const RELEVANCE_STATUS_DISPLAY: Record<RelevanceStatus, string> = {
    HIGHLY_RELEVANT: 'Highly Relevant',
    RELEVANT: 'Relevant',
    MARGINAL: 'Marginal',
    NOT_RELEVANT: 'Not Relevant'
};

export const CASE_STATUS_DISPLAY: Record<CaseStatus, string> = {
    ACTIVE: 'Active',
    CLOSED: 'Closed',
    ARCHIVED: 'Archived'
};

export const PRODUCTION_STATUS_DISPLAY: Record<ProductionSetStatus, string> = {
    DRAFT: 'Draft',
    IN_REVIEW: 'In Review',
    APPROVED: 'Approved',
    PRODUCED: 'Produced'
};

export const WORKFLOW_STAGE_TERMS = {
    upload: {
        term: 'Upload',
        description: 'Transfer files from a user device into the platform.'
    },
    process: {
        term: 'Process',
        description: 'Extract text, metadata, and readiness signals for review workflows.'
    },
    ingest: {
        term: 'Ingest',
        description: 'Make processed documents available in searchable review systems.'
    }
} as const;

export const AUDIT_ACTION_DISPLAY: Record<string, AuditActionMeta> = {
    CREATE: { label: 'Create', pastTenseLabel: 'Created', category: 'other' },
    UPDATE: { label: 'Update', pastTenseLabel: 'Updated', category: 'other' },
    DELETE: { label: 'Delete', pastTenseLabel: 'Deleted', category: 'other' },
    VIEW: { label: 'View', pastTenseLabel: 'Viewed', category: 'other' },
    LOGIN: { label: 'Login', pastTenseLabel: 'Logged In', category: 'security' },
    LOGOUT: { label: 'Logout', pastTenseLabel: 'Logged Out', category: 'security' },
    EXPORT: { label: 'Export', pastTenseLabel: 'Exported', category: 'other' },
    APPROVE: { label: 'Approve', pastTenseLabel: 'Approved', category: 'other' },
    REJECT: { label: 'Reject', pastTenseLabel: 'Rejected', category: 'other' },

    DOCUMENT_UPLOAD: { label: 'Document Upload', pastTenseLabel: 'Uploaded', category: 'document' },
    DOCUMENT_VIEW: { label: 'Document View', pastTenseLabel: 'Viewed', category: 'document' },
    DOCUMENT_DOWNLOAD: { label: 'Document Download', pastTenseLabel: 'Downloaded', category: 'document' },
    DOCUMENT_CODED: { label: 'Document Coding', pastTenseLabel: 'Coded', category: 'document' },
    DOCUMENT_DELETED: { label: 'Document Delete', pastTenseLabel: 'Deleted', category: 'document' },

    CASE_CREATED: { label: 'Case Create', pastTenseLabel: 'Created', category: 'case' },
    CASE_UPDATED: { label: 'Case Update', pastTenseLabel: 'Updated', category: 'case' },
    CASE_ARCHIVED: { label: 'Case Archive', pastTenseLabel: 'Archived', category: 'case' },
    CASE_TEAM_MEMBER_ADDED: { label: 'Case Team Member Add', pastTenseLabel: 'Added Team Member', category: 'case' },
    CASE_TEAM_MEMBER_REMOVED: { label: 'Case Team Member Remove', pastTenseLabel: 'Removed Team Member', category: 'case' },

    USER_CREATED: { label: 'User Create', pastTenseLabel: 'Created', category: 'user' },
    USER_UPDATED: { label: 'User Update', pastTenseLabel: 'Updated', category: 'user' },
    USER_DELETED: { label: 'User Delete', pastTenseLabel: 'Deleted', category: 'user' },
    USER_DEACTIVATED: { label: 'User Deactivate', pastTenseLabel: 'Deactivated', category: 'user' },
    USER_ACTIVATED: { label: 'User Activate', pastTenseLabel: 'Activated', category: 'user' },

    PRODUCTION_CREATED: { label: 'Production Create', pastTenseLabel: 'Created', category: 'production' },
    PRODUCTION_SUBMITTED: { label: 'Production Submit', pastTenseLabel: 'Submitted', category: 'production' },
    PRODUCTION_APPROVED: { label: 'Production Approve', pastTenseLabel: 'Approved', category: 'production' },
    PRODUCTION_PRODUCED: { label: 'Production Mark Produced', pastTenseLabel: 'Marked as Produced', category: 'production' },
    PRODUCTION_DELETED: { label: 'Production Delete', pastTenseLabel: 'Deleted', category: 'production' },

    TAG_CREATED: { label: 'Tag Create', pastTenseLabel: 'Created', category: 'tag' },
    TAG_UPDATED: { label: 'Tag Update', pastTenseLabel: 'Updated', category: 'tag' },
    TAG_DELETED: { label: 'Tag Delete', pastTenseLabel: 'Deleted', category: 'tag' },

    CUSTODIAN_CREATED: { label: 'Custodian Create', pastTenseLabel: 'Created', category: 'custodian' },
    CUSTODIAN_UPDATED: { label: 'Custodian Update', pastTenseLabel: 'Updated', category: 'custodian' },
    CUSTODIAN_DELETED: { label: 'Custodian Delete', pastTenseLabel: 'Deleted', category: 'custodian' },
    CUSTODIAN_BATCH_IMPORTED: { label: 'Custodian Batch Import', pastTenseLabel: 'Imported Custodians', category: 'custodian' },

    SYSTEM_SETTINGS_UPDATED: { label: 'System Settings Update', pastTenseLabel: 'Updated', category: 'system' },
    INTEGRATION_CREATED: { label: 'Integration Create', pastTenseLabel: 'Created', category: 'integration' },
    INTEGRATION_UPDATED: { label: 'Integration Update', pastTenseLabel: 'Updated', category: 'integration' },
    INTEGRATION_DELETED: { label: 'Integration Delete', pastTenseLabel: 'Deleted', category: 'integration' },
    LICENSE_UPDATED: { label: 'License Update', pastTenseLabel: 'Updated', category: 'system' },
    BILLING_UPDATED: { label: 'Billing Update', pastTenseLabel: 'Updated', category: 'billing' },

    CLIENT_PORTAL_SHARED: { label: 'Client Portal Share', pastTenseLabel: 'Shared', category: 'portal' },
    CLIENT_PORTAL_REVOKED: { label: 'Client Portal Revoke', pastTenseLabel: 'Revoked', category: 'portal' }
};

export const ENTITY_TYPE_DISPLAY: Record<string, string> = {
    User: 'User',
    Document: 'Document',
    Case: 'Case',
    IssueTag: 'Issue Tag',
    Production: 'Production',
    ProductionSet: 'Production Set',
    Custodian: 'Custodian',
    SystemSetting: 'System Setting',
    Integration: 'Integration',
    LicenseState: 'License',
    BillingSummary: 'Billing',
    ClientPortalShare: 'Client Portal Share',
    Notification: 'Notification'
};

const normalizeWhitespace = (value: string): string => {
    return value.replace(/\s+/g, ' ').trim();
};

const splitToken = (value: string): string => {
    return normalizeWhitespace(
        value
            .replace(/[_-]+/g, ' ')
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
            .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    );
};

export const toTitleCaseLabel = (value: string): string => {
    if (!value) {
        return '';
    }

    const words = splitToken(value)
        .split(' ')
        .map((token) => {
            const lowerToken = token.toLowerCase();
            if (lowerToken === 'id') {
                return 'ID';
            }
            if (lowerToken === 'ip') {
                return 'IP';
            }
            return lowerToken.charAt(0).toUpperCase() + lowerToken.slice(1);
        });

    return words.join(' ');
};

const toUpperActionKey = (value: string): string => {
    return splitToken(value).replace(/\s+/g, '_').toUpperCase();
};

export const formatRoleLabel = (role: string): string => {
    const key = role.trim().toUpperCase() as UserRole;
    return ROLE_DISPLAY[key]?.label ?? toTitleCaseLabel(role);
};

export const formatCaseRoleLabel = (role: string): string => {
    const key = role.trim().toUpperCase() as CaseRole;
    return CASE_ROLE_DISPLAY[key]?.label ?? toTitleCaseLabel(role);
};

export const formatPrivilegeStatusLabel = (status: string): string => {
    const key = status.trim().toUpperCase() as PrivilegeStatus;
    return PRIVILEGE_STATUS_DISPLAY[key] ?? toTitleCaseLabel(status);
};

export const formatRelevanceStatusLabel = (status: string): string => {
    const key = status.trim().toUpperCase() as RelevanceStatus;
    return RELEVANCE_STATUS_DISPLAY[key] ?? toTitleCaseLabel(status);
};

export const formatCaseStatusLabel = (status: string): string => {
    const key = status.trim().toUpperCase() as CaseStatus;
    return CASE_STATUS_DISPLAY[key] ?? toTitleCaseLabel(status);
};

export const formatProductionStatusLabel = (status: string): string => {
    const key = status.trim().toUpperCase() as ProductionSetStatus;
    return PRODUCTION_STATUS_DISPLAY[key] ?? toTitleCaseLabel(status);
};

export const formatAuditActionLabel = (action: string): string => {
    const key = toUpperActionKey(action);
    return AUDIT_ACTION_DISPLAY[key]?.label ?? toTitleCaseLabel(action);
};

export const formatAuditActionPastTenseLabel = (action: string): string => {
    const key = toUpperActionKey(action);
    return AUDIT_ACTION_DISPLAY[key]?.pastTenseLabel ?? toTitleCaseLabel(action);
};

export const formatEntityTypeLabel = (entityType: string): string => {
    if (!entityType) {
        return '';
    }

    const exact = ENTITY_TYPE_DISPLAY[entityType];
    if (exact) {
        return exact;
    }

    const normalized = splitToken(entityType);
    const key = normalized.replace(/\s+/g, '');
    if (ENTITY_TYPE_DISPLAY[key]) {
        return ENTITY_TYPE_DISPLAY[key];
    }

    return toTitleCaseLabel(entityType);
};
