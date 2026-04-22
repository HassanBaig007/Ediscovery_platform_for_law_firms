export type UserRole = 'ADMIN' | 'PARTNER' | 'ASSOCIATE' | 'PARALEGAL';

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isActive: boolean;
    createdAt: string;
}

export interface AuthResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
}

export interface IIssueTag {
    id: string;
    tagName: string;
    tagDescription?: string;
    color: string;
}

export interface IDocument {
    id: string;
    filename: string;
    fileType: string;
    size: number;
    uploadDate: string;
    path: string;
    custodianId?: {
        _id: string;
        name: string;
    } | string;
    tags?: IIssueTag[] | string[];
    coding?: {
        privilegeStatus: string;
        privilegeReason?: string;
        relevanceStatus: string;
        isConfidential: boolean;
        reviewNotes?: string;
        reviewedBy?: string;
        reviewedAt?: string;
    };
    docNumber?: number;
    extractedText?: string;
}
