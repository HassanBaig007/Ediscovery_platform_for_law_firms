export type UserRole = 'ADMIN' | 'PARTNER' | 'ASSOCIATE' | 'PARALEGAL';
export type CaseStatus = 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
export type CaseRole = 'LEAD' | 'REVIEWER' | 'PARALEGAL';
export type PrivilegeStatus = 'NOT_PRIVILEGED' | 'ATTORNEY_CLIENT' | 'WORK_PRODUCT' | 'NEEDS_REVIEW';
export type RelevanceStatus = 'HIGHLY_RELEVANT' | 'RELEVANT' | 'NOT_RELEVANT' | 'MARGINAL';
export type ProductionSetStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PRODUCED';

export interface IUser {
    id: string;
    email: string;
    passwordHash?: string; // Optional on frontend
    firstName: string;
    lastName: string;
    role: UserRole;
    isActive: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface ITeamMember {
    user: string; // ObjectId
    role: CaseRole;
    assignedAt: string | Date;
}

export interface ICase {
    id: string;
    caseNumber: string;
    caseName: string;
    clientName: string;
    opposingParty: string;
    description?: string;
    status: CaseStatus;
    createdBy: string; // ObjectId
    team: ITeamMember[];
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface ICustodian {
    id: string;
    caseId: string;
    name: string;
    email: string;
    department?: string;
    title?: string;
    createdAt: string | Date;
}

export interface IDocumentCoding {
    reviewedBy?: string;
    privilegeStatus: PrivilegeStatus;
    privilegeReason?: string;
    relevanceStatus: RelevanceStatus;
    isConfidential: boolean;
    reviewNotes?: string;
    reviewedAt?: string | Date;
    updatedAt?: string | Date;
}

export interface IDocument {
    id: string;
    caseId: string;
    custodianId: string;
    docNumber: string;
    filename: string;
    fileType: string;
    fileSize: number;
    filePath: string;
    md5Hash: string;
    documentDate?: string | Date;
    uploadedBy: string;
    uploadedAt: string | Date;
    isDuplicate: boolean;
    masterDocId?: string;
    extractedText?: string;
    coding?: IDocumentCoding;
    tags: string[] | any[]; // ObjectIds or populated objects
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface IIssueTag {
    id: string;
    caseId: string;
    tagName: string;
    tagDescription?: string;
    color?: string; // Optional because default exists
    createdAt?: string | Date;
    updatedAt?: string | Date;
}

export interface IProductionDocument {
    documentId: string;
    batesNumber?: string;
    isRedacted: boolean;
    addedAt: string | Date;
}

export interface IProductionSet {
    id: string;
    caseId: string;
    setName: string;
    description?: string;
    status: ProductionSetStatus;
    documents: IProductionDocument[];
    documentCount: number;
    createdBy: string;
    approvedBy?: string;
    approvedAt?: string | Date;
    producedAt?: string | Date;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface IAuditLog {
    id: string;
    userId: string;
    action: string;
    entityType: string;
    entityId?: string;
    details?: Record<string, any>;
    ipAddress?: string;
    createdAt: string | Date;
}

export interface ISearchFilters {
    caseId: string;
    custodianIds?: string[];
    dateRange?: {
        from?: string; // Date string
        to?: string;   // Date string
    };
    privilegeStatuses?: PrivilegeStatus[];
    relevanceStatuses?: RelevanceStatus[];
    issueTagIds?: string[];
    hasNotes?: boolean;
    filenameQuery?: string;
    isDuplicate?: boolean;
}

export interface ISavedSearch {
    id: string;
    caseId: string;
    userId: string;
    searchName: string;
    filters: ISearchFilters;
    createdAt: string | Date;
}
