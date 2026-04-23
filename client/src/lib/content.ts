import {
    AUDIT_ACTION_DISPLAY,
    ROLE_DISPLAY,
    formatAuditActionLabel,
    formatAuditActionPastTenseLabel,
    formatCaseRoleLabel,
    formatCaseStatusLabel,
    formatEntityTypeLabel,
    formatPrivilegeStatusLabel,
    formatProductionStatusLabel,
    formatRelevanceStatusLabel,
    formatRoleLabel,
    toTitleCaseLabel,
    WORKFLOW_STAGE_TERMS
} from '../../../shared/content';

export {
    AUDIT_ACTION_DISPLAY,
    ROLE_DISPLAY,
    formatAuditActionLabel,
    formatAuditActionPastTenseLabel,
    formatCaseRoleLabel,
    formatCaseStatusLabel,
    formatEntityTypeLabel,
    formatPrivilegeStatusLabel,
    formatProductionStatusLabel,
    formatRelevanceStatusLabel,
    formatRoleLabel,
    toTitleCaseLabel,
    WORKFLOW_STAGE_TERMS
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
    document: 'bg-info/12 text-info border-info/20',
    case: 'bg-primary/12 text-primary border-primary/20',
    user: 'bg-purple/12 text-purple border-purple/20',
    production: 'bg-warning/12 text-warning border-warning/20',
    tag: 'bg-primary/12 text-primary border-primary/20',
    custodian: 'bg-success/12 text-success border-success/20',
    system: 'bg-muted text-muted-foreground border-border',
    security: 'bg-purple/12 text-purple border-purple/20',
    portal: 'bg-info/12 text-info border-info/20',
    billing: 'bg-warning/12 text-warning border-warning/20',
    integration: 'bg-primary/12 text-primary border-primary/20',
    other: 'bg-muted text-muted-foreground border-border'
};

export const getAuditActionClassName = (action: string): string => {
    const actionMeta = AUDIT_ACTION_DISPLAY[action.trim().toUpperCase()];
    if (!actionMeta) {
        return ACTION_CLASSNAME_BY_CATEGORY.other;
    }

    return ACTION_CLASSNAME_BY_CATEGORY[actionMeta.category] ?? ACTION_CLASSNAME_BY_CATEGORY.other;
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
    processingSummary: `Track ${WORKFLOW_STAGE_TERMS.upload.term.toLowerCase()}, ${WORKFLOW_STAGE_TERMS.process.term.toLowerCase()}, and ${WORKFLOW_STAGE_TERMS.ingest.term.toLowerCase()} status for this case.`
} as const;
