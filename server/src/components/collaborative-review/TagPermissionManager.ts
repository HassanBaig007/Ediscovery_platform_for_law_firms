// Tag Permission Manager
// Manages role-based tag visibility and permissions

import { Tag } from '../../../../shared/enhanced-types';
import { UserRole } from '../../../../shared/types';

export interface TagPermission {
    tagId: string;
    canView: UserRole[];
    canApply: UserRole[];
    canRemove: UserRole[];
    canEdit: UserRole[];
}

export interface TagOperation {
    documentId: string;
    tagId: string;
    userId: string;
    userRole: UserRole;
    operation: 'view' | 'apply' | 'remove' | 'edit';
    timestamp: Date;
}

export class TagPermissionManager {
    private permissions: Map<string, TagPermission> = new Map();
    private defaultPermissions: Omit<TagPermission, 'tagId'>;

    constructor() {
        // Default permissions: all roles can view and apply, only ADMIN can edit
        this.defaultPermissions = {
            canView: ['ADMIN', 'PARTNER', 'ASSOCIATE', 'PARALEGAL'],
            canApply: ['ADMIN', 'PARTNER', 'ASSOCIATE', 'PARALEGAL'],
            canRemove: ['ADMIN', 'PARTNER', 'ASSOCIATE'],
            canEdit: ['ADMIN', 'PARTNER']
        };
    }

    /**
     * Set permissions for a tag
     */
    setTagPermissions(tagId: string, permissions: Partial<Omit<TagPermission, 'tagId'>>): void {
        const existing = this.permissions.get(tagId);
        
        const tagPermission: TagPermission = {
            tagId,
            canView: permissions.canView || existing?.canView || this.defaultPermissions.canView,
            canApply: permissions.canApply || existing?.canApply || this.defaultPermissions.canApply,
            canRemove: permissions.canRemove || existing?.canRemove || this.defaultPermissions.canRemove,
            canEdit: permissions.canEdit || existing?.canEdit || this.defaultPermissions.canEdit
        };

        this.permissions.set(tagId, tagPermission);
    }

    /**
     * Check if user can perform operation on tag
     */
    canPerformOperation(
        tagId: string,
        userRole: UserRole,
        operation: TagOperation['operation']
    ): boolean {
        const permissions = this.permissions.get(tagId) || {
            tagId,
            ...this.defaultPermissions
        };

        switch (operation) {
            case 'view':
                return permissions.canView.includes(userRole);
            case 'apply':
                return permissions.canApply.includes(userRole);
            case 'remove':
                return permissions.canRemove.includes(userRole);
            case 'edit':
                return permissions.canEdit.includes(userRole);
            default:
                return false;
        }
    }

    /**
     * Authorize tag operation
     */
    async authorizeOperation(operation: TagOperation): Promise<{ authorized: boolean; reason?: string }> {
        const canPerform = this.canPerformOperation(operation.tagId, operation.userRole, operation.operation);

        if (!canPerform) {
            return {
                authorized: false,
                reason: `User with role ${operation.userRole} is not authorized to ${operation.operation} tag ${operation.tagId}`
            };
        }

        return { authorized: true };
    }

    /**
     * Get visible tags for a user role
     */
    getVisibleTags(tags: Tag[], userRole: UserRole): Tag[] {
        return tags.filter(tag => this.canPerformOperation(tag.id, userRole, 'view'));
    }

    /**
     * Get tags user can apply
     */
    getApplicableTags(tags: Tag[], userRole: UserRole): Tag[] {
        return tags.filter(tag => this.canPerformOperation(tag.id, userRole, 'apply'));
    }

    /**
     * Get permissions for a tag
     */
    getTagPermissions(tagId: string): TagPermission {
        return this.permissions.get(tagId) || {
            tagId,
            ...this.defaultPermissions
        };
    }

    /**
     * Check if user has any permission on tag
     */
    hasAnyPermission(tagId: string, userRole: UserRole): boolean {
        return this.canPerformOperation(tagId, userRole, 'view') ||
               this.canPerformOperation(tagId, userRole, 'apply') ||
               this.canPerformOperation(tagId, userRole, 'remove') ||
               this.canPerformOperation(tagId, userRole, 'edit');
    }

    /**
     * Bulk authorize operations
     */
    async bulkAuthorize(operations: TagOperation[]): Promise<Map<string, boolean>> {
        const results = new Map<string, boolean>();

        for (const operation of operations) {
            const key = `${operation.documentId}-${operation.tagId}-${operation.operation}`;
            const result = await this.authorizeOperation(operation);
            results.set(key, result.authorized);
        }

        return results;
    }
}
