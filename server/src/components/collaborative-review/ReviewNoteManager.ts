// Review Note Manager
// Manages review notes with versioning and edit history

import { ReviewNote } from '../../../../shared/enhanced-types';

export interface NoteVersion {
    version: number;
    content: string;
    editedAt: Date;
    editedBy: string;
}

export interface NoteHistory {
    noteId: string;
    versions: NoteVersion[];
}

export class ReviewNoteManager {
    private notes: Map<string, ReviewNote> = new Map();
    private noteHistory: Map<string, NoteHistory> = new Map();

    /**
     * Add a new note to a document
     */
    async addNote(
        documentId: string,
        reviewerId: string,
        content: string,
        mentions?: string[]
    ): Promise<ReviewNote> {
        const note: ReviewNote = {
            id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            documentId,
            reviewerId,
            content,
            createdAt: new Date(),
            updatedAt: new Date(),
            mentions,
            isResolved: false
        };

        this.notes.set(note.id, note);

        // Initialize history
        this.noteHistory.set(note.id, {
            noteId: note.id,
            versions: [{
                version: 1,
                content,
                editedAt: note.createdAt,
                editedBy: reviewerId
            }]
        });

        return note;
    }

    /**
     * Update an existing note
     */
    async updateNote(
        noteId: string,
        userId: string,
        content: string
    ): Promise<ReviewNote> {
        const note = this.notes.get(noteId);

        if (!note) {
            throw new Error(`Note ${noteId} not found`);
        }

        // Only the original author can edit
        if (note.reviewerId !== userId) {
            throw new Error(`Only the note author can edit this note`);
        }

        // Update note
        note.content = content;
        note.updatedAt = new Date();
        this.notes.set(noteId, note);

        // Add to history
        const history = this.noteHistory.get(noteId);
        if (history) {
            const newVersion = history.versions.length + 1;
            history.versions.push({
                version: newVersion,
                content,
                editedAt: note.updatedAt,
                editedBy: userId
            });
        }

        return note;
    }

    /**
     * Delete a note
     */
    async deleteNote(noteId: string, userId: string): Promise<void> {
        const note = this.notes.get(noteId);

        if (!note) {
            throw new Error(`Note ${noteId} not found`);
        }

        // Only the original author can delete
        if (note.reviewerId !== userId) {
            throw new Error(`Only the note author can delete this note`);
        }

        this.notes.delete(noteId);
        this.noteHistory.delete(noteId);
    }

    /**
     * Get all notes for a document
     */
    getDocumentNotes(documentId: string): ReviewNote[] {
        return Array.from(this.notes.values())
            .filter(note => note.documentId === documentId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    /**
     * Get note by ID
     */
    getNote(noteId: string): ReviewNote | undefined {
        return this.notes.get(noteId);
    }

    /**
     * Get note history
     */
    getNoteHistory(noteId: string): NoteHistory | undefined {
        return this.noteHistory.get(noteId);
    }

    /**
     * Resolve a note
     */
    async resolveNote(noteId: string, userId: string): Promise<ReviewNote> {
        const note = this.notes.get(noteId);

        if (!note) {
            throw new Error(`Note ${noteId} not found`);
        }

        note.isResolved = true;
        note.updatedAt = new Date();
        this.notes.set(noteId, note);

        return note;
    }

    /**
     * Unresolve a note
     */
    async unresolveNote(noteId: string, userId: string): Promise<ReviewNote> {
        const note = this.notes.get(noteId);

        if (!note) {
            throw new Error(`Note ${noteId} not found`);
        }

        note.isResolved = false;
        note.updatedAt = new Date();
        this.notes.set(noteId, note);

        return note;
    }

    /**
     * Get notes mentioning a user
     */
    getNotesForUser(userId: string): ReviewNote[] {
        return Array.from(this.notes.values())
            .filter(note => note.mentions?.includes(userId))
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    /**
     * Get unresolved notes for a document
     */
    getUnresolvedNotes(documentId: string): ReviewNote[] {
        return Array.from(this.notes.values())
            .filter(note => note.documentId === documentId && !note.isResolved)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    /**
     * Search notes by content
     */
    searchNotes(searchText: string, documentId?: string): ReviewNote[] {
        const searchLower = searchText.toLowerCase();
        
        return Array.from(this.notes.values())
            .filter(note => {
                const matchesContent = note.content.toLowerCase().includes(searchLower);
                const matchesDocument = !documentId || note.documentId === documentId;
                return matchesContent && matchesDocument;
            })
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
}
