// Concurrency Manager for Collaborative Review
// Implements optimistic locking and conflict detection

export interface DocumentLock {
    documentId: string;
    userId: string;
    lockedAt: Date;
    version: number;
    expiresAt: Date;
}

export interface ModificationAttempt {
    documentId: string;
    userId: string;
    version: number;
    changes: any;
    timestamp: Date;
}

export interface ConflictResolution {
    documentId: string;
    resolvedBy: string;
    resolution: 'accept_mine' | 'accept_theirs' | 'merge';
    resolvedAt: Date;
}

export class ConcurrencyManager {
    private locks: Map<string, DocumentLock> = new Map();
    private versions: Map<string, number> = new Map();
    private lockTimeout: number;

    constructor(lockTimeoutMs = 300000) { // 5 minutes default
        this.lockTimeout = lockTimeoutMs;
    }

    /**
     * Acquire lock on a document
     */
    async acquireLock(documentId: string, userId: string): Promise<DocumentLock> {
        // Clean up expired locks
        this.cleanupExpiredLocks();

        const existingLock = this.locks.get(documentId);

        // Check if document is already locked by another user
        if (existingLock && existingLock.userId !== userId) {
            if (existingLock.expiresAt > new Date()) {
                throw new Error(
                    `Document ${documentId} is locked by user ${existingLock.userId} until ${existingLock.expiresAt.toISOString()}`
                );
            }
        }

        // Create or update lock
        const version = this.versions.get(documentId) || 0;
        const lock: DocumentLock = {
            documentId,
            userId,
            lockedAt: new Date(),
            version,
            expiresAt: new Date(Date.now() + this.lockTimeout)
        };

        this.locks.set(documentId, lock);
        return lock;
    }

    /**
     * Release lock on a document
     */
    async releaseLock(documentId: string, userId: string): Promise<void> {
        const lock = this.locks.get(documentId);

        if (!lock) {
            return; // No lock to release
        }

        if (lock.userId !== userId) {
            throw new Error(`Cannot release lock: document ${documentId} is locked by user ${lock.userId}`);
        }

        this.locks.delete(documentId);
    }

    /**
     * Attempt to modify a document with version check
     */
    async attemptModification(attempt: ModificationAttempt): Promise<{ success: boolean; conflict?: any }> {
        const currentVersion = this.versions.get(attempt.documentId) || 0;

        // Check version conflict
        if (attempt.version !== currentVersion) {
            return {
                success: false,
                conflict: {
                    documentId: attempt.documentId,
                    expectedVersion: attempt.version,
                    currentVersion,
                    message: 'Document has been modified by another user'
                }
            };
        }

        // Check lock
        const lock = this.locks.get(attempt.documentId);
        if (lock && lock.userId !== attempt.userId) {
            return {
                success: false,
                conflict: {
                    documentId: attempt.documentId,
                    lockedBy: lock.userId,
                    message: `Document is locked by user ${lock.userId}`
                }
            };
        }

        // Apply modification
        this.versions.set(attempt.documentId, currentVersion + 1);
        
        return { success: true };
    }

    /**
     * Get current version of a document
     */
    getDocumentVersion(documentId: string): number {
        return this.versions.get(documentId) || 0;
    }

    /**
     * Detect conflicts between modifications
     */
    detectConflict(documentId: string, userId: string, expectedVersion: number): boolean {
        const currentVersion = this.versions.get(documentId) || 0;
        
        if (expectedVersion !== currentVersion) {
            return true;
        }

        const lock = this.locks.get(documentId);
        if (lock && lock.userId !== userId && lock.expiresAt > new Date()) {
            return true;
        }

        return false;
    }

    /**
     * Resolve conflict
     */
    async resolveConflict(
        documentId: string,
        resolution: ConflictResolution
    ): Promise<void> {
        // Release any locks
        this.locks.delete(documentId);

        // Increment version
        const currentVersion = this.versions.get(documentId) || 0;
        this.versions.set(documentId, currentVersion + 1);
    }

    /**
     * Clean up expired locks
     */
    private cleanupExpiredLocks(): void {
        const now = new Date();
        
        for (const [documentId, lock] of this.locks.entries()) {
            if (lock.expiresAt <= now) {
                this.locks.delete(documentId);
            }
        }
    }

    /**
     * Get all active locks
     */
    getActiveLocks(): DocumentLock[] {
        this.cleanupExpiredLocks();
        return Array.from(this.locks.values());
    }

    /**
     * Force release all locks for a user
     */
    async forceReleaseUserLocks(userId: string): Promise<number> {
        let count = 0;
        
        for (const [documentId, lock] of this.locks.entries()) {
            if (lock.userId === userId) {
                this.locks.delete(documentId);
                count++;
            }
        }

        return count;
    }

    /**
     * Extend lock expiration
     */
    async extendLock(documentId: string, userId: string): Promise<DocumentLock> {
        const lock = this.locks.get(documentId);

        if (!lock) {
            throw new Error(`No lock found for document ${documentId}`);
        }

        if (lock.userId !== userId) {
            throw new Error(`Cannot extend lock: document ${documentId} is locked by user ${lock.userId}`);
        }

        lock.expiresAt = new Date(Date.now() + this.lockTimeout);
        this.locks.set(documentId, lock);

        return lock;
    }
}
