import {
    ROLE_LABELS,
    CASE_ROLE_LABELS,
    CASE_STATUS_LABELS,
    PRIVILEGE_LABELS,
    RELEVANCE_LABELS,
    PRODUCTION_STATUS_LABELS,
    ENTITY_LABELS,
    AUDIT_ACTION_LABELS,
    INGESTION_STAGES
} from '../../../shared/constants';
import {
    UserRole,
    CaseRole,
    CaseStatus,
    PrivilegeStatus,
    RelevanceStatus,
    ProductionSetStatus
} from '../../../shared/types';

export const formatUserRole = (role: UserRole | string): string => {
    return ROLE_LABELS[role as UserRole] || role;
};

export const formatCaseRole = (role: CaseRole | string): string => {
    return CASE_ROLE_LABELS[role as CaseRole] || role;
};

export const formatCaseStatus = (status: CaseStatus | string): string => {
    return CASE_STATUS_LABELS[status as CaseStatus] || status;
};

export const formatPrivilegeStatus = (status: PrivilegeStatus | string): string => {
    return PRIVILEGE_LABELS[status as PrivilegeStatus] || status;
};

export const formatRelevanceStatus = (status: RelevanceStatus | string): string => {
    return RELEVANCE_LABELS[status as RelevanceStatus] || status;
};

export const formatProductionStatus = (status: ProductionSetStatus | string): string => {
    return PRODUCTION_STATUS_LABELS[status as ProductionSetStatus] || status;
};

export const formatEntityName = (entity: string): string => {
    const key = entity.toLowerCase();
    return ENTITY_LABELS[key] || entity;
};

export const formatAuditAction = (action: string): string => {
    const key = action.toUpperCase();
    return AUDIT_ACTION_LABELS[key] || action;
};

export const formatAuditSentence = (action: string, entityType: string, entityId?: string): string => {
    const formattedAction = formatAuditAction(action);
    const formattedEntity = formatEntityName(entityType);
    return `${formattedAction} ${formattedEntity}${entityId ? ` (${entityId})` : ''}`;
};

export const ROLE_BADGE_CLASSNAMES: Record<string, string> = {
    ADMIN: 'bg-destructive/10 text-destructive border-destructive/20',
    PARTNER: 'bg-purple/10 text-purple border-purple/20',
    ASSOCIATE: 'bg-primary/10 text-primary border-primary/20',
    PARALEGAL: 'bg-success/10 text-success border-success/20'
};

export const ROLE_DASHBOARD_SUMMARIES: Record<string, string> = {
    ADMIN: 'Full system access to manage users, cases, compliance, and platform settings.',
    PARTNER: 'Oversee case progress, review team outcomes, and finalize productions.',
    ASSOCIATE: 'Search, review, and code documents assigned to your active cases.',
    PARALEGAL: 'Upload materials, manage custodians, and monitor processing readiness.'
};

const ACTION_CLASSNAME_BY_CATEGORY: Record<string, string> = {
    create: 'bg-success/12 text-success border-success/20',
    update: 'bg-primary/12 text-primary border-primary/20',
    delete: 'bg-destructive/12 text-destructive border-destructive/20',
    document: 'bg-info/12 text-info border-info/20',
    security: 'bg-purple/12 text-purple border-purple/20',
    production: 'bg-warning/12 text-warning border-warning/20',
    other: 'bg-muted text-muted-foreground border-border'
};

export const getAuditActionClassName = (action: string): string => {
    const act = action.trim().toUpperCase();
    if (['CREATE', 'UPLOAD', 'IMPORT'].includes(act)) return ACTION_CLASSNAME_BY_CATEGORY.create;
    if (['UPDATE', 'EDIT', 'CODE'].includes(act)) return ACTION_CLASSNAME_BY_CATEGORY.update;
    if (['DELETE', 'REMOVE', 'REVOKE'].includes(act)) return ACTION_CLASSNAME_BY_CATEGORY.delete;
    if (['DOWNLOAD', 'EXPORT', 'VIEW'].includes(act)) return ACTION_CLASSNAME_BY_CATEGORY.document;
    if (['LOGIN', 'LOGOUT'].includes(act)) return ACTION_CLASSNAME_BY_CATEGORY.security;
    if (['APPROVE', 'REJECT', 'PRODUCE'].includes(act)) return ACTION_CLASSNAME_BY_CATEGORY.production;
    return ACTION_CLASSNAME_BY_CATEGORY.other;
};

export const getPermissionDeniedMessage = (requiredRole?: string): string => {
    if (requiredRole) {
        return `You need ${requiredRole} access to open this page.`;
    }
    return 'You do not have permission to open this page.';
};

export const CONTENT_TONE = {
    emptyStateSuffix: 'No action is required right now.',
    retryHint: 'Retry in a moment or refresh the page.',
    processingSummary: `Track ${INGESTION_STAGES.UPLOAD.toLowerCase()}, ${INGESTION_STAGES.PROCESS.toLowerCase()}, and ${INGESTION_STAGES.INGEST.toLowerCase()} status for this case.`
} as const;
