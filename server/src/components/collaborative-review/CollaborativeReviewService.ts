// Collaborative Review Service
// Main service that implements the CollaborativeReview interface

import {
    CollaborativeReview,
    ReviewProgress,
    ReviewNote,
    Tag
} from '../../../../shared/enhanced-types';
import { UserRole } from '../../../../shared/types';
import { ReviewAssignmentManager } from './ReviewAssignmentManager';
import { ConcurrencyManager } from './ConcurrencyManager';
import { ReviewNoteManager } from './ReviewNoteManager';
import { TagPermissionManager } from './TagPermissionManager';
import User from '../../models/User';

export class CollaborativeReviewService implements CollaborativeReview {
    private assignmentManager: ReviewAssignmentManager;
    private concurrencyManager: ConcurrencyManager;
    private noteManager: ReviewNoteManager;
    private tagPermissionManager: TagPermissionManager;
    private documentTags: Map<string, Set<string>> = new Map(); // documentId -> Set<tagId>

    constructor() {
        this.assignmentManager = new ReviewAssignmentManager();
        this.concurrencyManager = new ConcurrencyManager();
        this.noteManager = new ReviewNoteManager();
        this.tagPermissionManager = new TagPermissionManager();
    }

    /**
     * Assign documents to a reviewer
     */
    async assignDocuments(reviewerId: string, documentIds: string[]): Promise<void> {
        await this.assignmentManager.assignDocuments(reviewerId, documentIds);
    }

    /**
     * Tag a document
     */
    async tagDocument(documentId: string, tag: Tag, reviewerId: string): Promise<void> {
        // Fetch user from database to get real role
        const userDoc = await User.findById(reviewerId);
        
        if (!userDoc || !userDoc.isActive) {
            throw new Error('User not found or inactive');
        }

        const userRole: UserRole = userDoc.role as UserRole;

        // Check permissions
        const authResult = await this.tagPermissionManager.authorizeOperation({
            documentId,
            tagId: tag.id,
            userId: reviewerId,
            userRole,
            operation: 'apply',
            timestamp: new Date()
        });

        if (!authResult.authorized) {
            throw new Error(authResult.reason || 'Not authorized to apply tag');
        }

        // Acquire lock
        await this.concurrencyManager.acquireLock(documentId, reviewerId);

        try {
            // Apply tag
            if (!this.documentTags.has(documentId)) {
                this.documentTags.set(documentId, new Set());
            }

            this.documentTags.get(documentId)!.add(tag.id);

            // Increment version
            const version = this.concurrencyManager.getDocumentVersion(documentId);
            await this.concurrencyManager.attemptModification({
                documentId,
                userId: reviewerId,
                version,
                changes: { addTag: tag.id },
                timestamp: new Date()
            });
        } finally {
            // Release lock
            await this.concurrencyManager.releaseLock(documentId, reviewerId);
        }
    }

    /**
     * Add a note to a document
     */
    async addNote(documentId: string, note: ReviewNote): Promise<void> {
        await this.noteManager.addNote(
            documentId,
            note.reviewerId,
            note.content,
            note.mentions
        );
    }

    /**
     * Get review progress for a review set
     */
    async getReviewProgress(reviewSetId: string): Promise<ReviewProgress> {
        // Get all assignments for the review set
        const assignmentIds = Array.from(this.assignmentManager['assignments'].keys());
        
        return await this.assignmentManager.getReviewProgress(assignmentIds);
    }

    /**
     * Resolve a conflict
     */
    async resolveConflict(documentId: string, resolution: any): Promise<void> {
        await this.concurrencyManager.resolveConflict(documentId, {
            documentId,
            resolvedBy: resolution.userId,
            resolution: resolution.strategy,
            resolvedAt: new Date()
        });
    }

    /**
     * Get document tags
     */
    getDocumentTags(documentId: string): string[] {
        return Array.from(this.documentTags.get(documentId) || []);
    }

    /**
     * Remove tag from document
     */
    async removeTag(documentId: string, tagId: string, userId: string, userRole: UserRole): Promise<void> {
        // Check permissions
        const authResult = await this.tagPermissionManager.authorizeOperation({
            documentId,
            tagId,
            userId,
            userRole,
            operation: 'remove',
            timestamp: new Date()
        });

        if (!authResult.authorized) {
            throw new Error(authResult.reason || 'Not authorized to remove tag');
        }

        // Acquire lock
        await this.concurrencyManager.acquireLock(documentId, userId);

        try {
            const tags = this.documentTags.get(documentId);
            if (tags) {
                tags.delete(tagId);
            }

            // Increment version
            const version = this.concurrencyManager.getDocumentVersion(documentId);
            await this.concurrencyManager.attemptModification({
                documentId,
                userId,
                version,
                changes: { removeTag: tagId },
                timestamp: new Date()
            });
        } finally {
            await this.concurrencyManager.releaseLock(documentId, userId);
        }
    }

    /**
     * Get notes for a document
     */
    getDocumentNotes(documentId: string): ReviewNote[] {
        return this.noteManager.getDocumentNotes(documentId);
    }

    /**
     * Update a note
     */
    async updateNote(noteId: string, userId: string, content: string): Promise<ReviewNote> {
        return await this.noteManager.updateNote(noteId, userId, content);
    }

    /**
     * Delete a note
     */
    async deleteNote(noteId: string, userId: string): Promise<void> {
        await this.noteManager.deleteNote(noteId, userId);
    }

    /**
     * Resolve a note
     */
    async resolveNote(noteId: string, userId: string): Promise<ReviewNote> {
        return await this.noteManager.resolveNote(noteId, userId);
    }
}
