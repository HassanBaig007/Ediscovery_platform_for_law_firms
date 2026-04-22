import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import IssueTag from '../models/IssueTag';
import Document from '../models/Document';
import { logAction } from '../middleware/audit.middleware';
// unused mongoose import removed

// @desc    Get tags for a case
// @route   GET /api/cases/:caseId/tags
// @access  Private
export const getTags = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { caseId } = req.params;
        const tags = await IssueTag.find({ caseId }).sort({ tagName: 1 });
        res.json(tags);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new tag
// @route   POST /api/cases/:caseId/tags
// @access  Private
export const createTag = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { caseId } = req.params;
        const { tagName, tagDescription, color } = req.body;

        const tagExists = await IssueTag.findOne({ caseId, tagName });
        if (tagExists) {
            res.status(400).json({ message: 'Tag already exists in this case' });
            return;
        }

        const tag = await IssueTag.create({
            caseId,
            tagName,
            tagDescription,
            color
        });

        // Audit
        // Use Type Assertion if user type is slightly mismatch in TS vs Mongoose
        await logAction(req.user!, 'TAG_CREATED', 'IssueTag', tag._id.toString(), { tagName });

        res.status(201).json(tag);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a tag
// @route   PUT /api/cases/:caseId/tags/:id
// @access  Private (Partner/Lead)
export const updateTag = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { tagName, tagDescription, color } = req.body;

        const tag = await IssueTag.findById(id);
        if (!tag) {
            res.status(404).json({ message: 'Tag not found' });
            return;
        }

        tag.tagName = tagName || tag.tagName;
        tag.tagDescription = tagDescription || tag.tagDescription;
        tag.color = color || tag.color;

        const updatedTag = await tag.save();
        res.json(updatedTag);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a tag
// @route   DELETE /api/cases/:caseId/tags/:id
// @access  Private (Partner/Lead)
export const deleteTag = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // Check if used in any documents?
        // Usually safe to delete, just remove ref from docs or let it be stale?
        // Mongoose doesn't auto-cascade. 
        // Let's remove from documents.
        await Document.updateMany(
            { tags: id },
            { $pull: { tags: id } }
        );

        await IssueTag.findByIdAndDelete(id);

        res.json({ message: 'Tag removed' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add tag to document
// @route   POST /api/documents/:id/tags
// @access  Private
export const addTagToDocument = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params; // Document ID
        const { tagId } = req.body;

        const doc = await Document.findById(id);
        if (!doc) {
            res.status(404).json({ message: 'Document not found' });
            return;
        }

        // Check duplicates
        // Use loose check or toString for mixed types (Populated vs ID)
        const isDuplicate = doc.tags.some((t: any) =>
            (t._id && t._id.toString() === tagId) || t.toString() === tagId
        );

        if (isDuplicate) {
            res.status(400).json({ message: 'Tag already applied' });
            return;
        }

        (doc.tags as any).push(tagId);
        await doc.save();

        res.json(doc);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Remove tag from document
// @route   DELETE /api/documents/:id/tags/:tagId
// @access  Private
export const removeTagFromDocument = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id, tagId } = req.params;

        const doc = await Document.findById(id);
        if (!doc) {
            res.status(404).json({ message: 'Document not found' });
            return;
        }

        doc.tags = (doc.tags as any[]).filter((t: any) => {
            const currentTagId = t._id ? t._id.toString() : t.toString();
            return currentTagId !== tagId;
        });
        await doc.save();

        res.json(doc);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
