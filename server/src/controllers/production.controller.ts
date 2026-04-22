import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/authMiddleware';
import Production from '../models/Production';
import Document from '../models/Document';
import { IUserDocument } from '../models/User';
import Notification from '../models/Notification';
import { stringifyCSV } from '../utils/export.util';

/**
 * @desc    Create a new production set
 * @route   POST /api/cases/:caseId/productions
 * @access  Private (Lead/Partner/Admin)
 */
export const createProduction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { caseId } = req.params;
        const { setName, description } = req.body;

        const production = await Production.create({
            caseId: caseId as any,
            setName,
            description,
            status: 'DRAFT',
            createdBy: req.user!._id as any
        } as any);

        res.status(201).json(production);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Add documents to production set
 * @route   POST /api/productions/:id/documents
 * @access  Private
 */
export const addDocumentsToProduction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { documentIds } = req.body;

        const production = await Production.findById(id);
        if (!production) {
            res.status(404).json({ message: 'Production set not found' });
            return;
        }

        if (production.status !== 'DRAFT') {
            res.status(400).json({ message: 'Cannot add documents to a non-draft production' });
            return;
        }

        // Fetch documents and check for privilege
        const docs = await Document.find({ _id: { $in: documentIds as string[] } });
        const crossCaseDoc = docs.find((doc) => doc.caseId.toString() !== production.caseId.toString());
        if (crossCaseDoc) {
            res.status(400).json({ message: 'All documents must belong to the same case as the production set' });
            return;
        }

        const privilegedDocs = docs.filter(doc =>
            doc.coding?.privilegeStatus !== 'NOT_PRIVILEGED'
        );

        if (privilegedDocs.length > 0) {
            res.status(400).json({
                message: 'Cannot add privileged documents to production',
                privilegedDocIds: privilegedDocs.map(d => d._id)
            });
            return;
        }

        // Generate Bates numbers
        // Sequence is based on current doc count in production
        let currentSequence = production.documents.length;

        const newDocs = docs.map(doc => {
            currentSequence++;
            const paddedSequence = currentSequence.toString().padStart(6, '0');
            const batesNumber = `${production.setName}-${paddedSequence}`;

            return {
                documentId: doc._id,
                batesNumber,
                isRedacted: false,
                addedAt: new Date()
            };
        });

        // Use $push with $each to add multiple
        production.documents.push(...(newDocs as any));
        await production.save();

        res.json(production);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Remove document from production
 * @route   DELETE /api/productions/:id/documents/:documentId
 * @access  Private
 */
export const removeDocumentFromProduction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id, documentId } = req.params;

        const production = await Production.findById(id);
        if (!production) {
            res.status(404).json({ message: 'Production set not found' });
            return;
        }

        if (production.status !== 'DRAFT') {
            res.status(400).json({ message: 'Cannot remove documents from a non-draft production' });
            return;
        }

        const document = await Document.findById(documentId).select('caseId');
        if (document && document.caseId.toString() !== production.caseId.toString()) {
            res.status(400).json({ message: 'Document does not belong to this production case' });
            return;
        }

        production.documents = (production.documents as any[]).filter(
            d => d.documentId.toString() !== documentId
        ) as any;
        // NOTE: Bates numbers are NOT re-sequenced. Once assigned they are immutable
        // identifiers required for chain-of-custody in court-admissible productions.

        await production.save();
        res.json(production);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Approve production set
 * @route   PUT /api/productions/:id/approve
 * @access  Private (Partner/Admin)
 */
export const approveProduction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const user = req.user as IUserDocument;

        if (user.role !== 'PARTNER' && user.role !== 'ADMIN') {
            res.status(403).json({ message: 'Only Partners or Admins can approve productions' });
            return;
        }

        const production = await Production.findById(id);
        if (!production) {
            res.status(404).json({ message: 'Production set not found' });
            return;
        }

        production.status = 'APPROVED';
        production.approvedBy = user._id as any;
        production.approvedAt = new Date();

        await production.save();

        // Notify production creator (fire-and-forget)
        Notification.create({
            userId: production.createdBy,
            type: 'REVIEW',
            title: 'Production Approved',
            message: `Production set "${production.setName}" has been approved.`,
            link: `/cases/${production.caseId}/productions`,
            isRead: false,
        }).catch(() => {});

        res.json(production);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Submit production for review (DRAFT → IN_REVIEW)
 * @route   PUT /api/productions/:id/submit
 * @access  Private
 */
export const submitForReview = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const production = await Production.findById(id);
        if (!production) {
            res.status(404).json({ message: 'Production set not found' });
            return;
        }
        if (production.status !== 'DRAFT') {
            res.status(400).json({ message: 'Only DRAFT productions can be submitted for review' });
            return;
        }
        production.status = 'IN_REVIEW';
        await production.save();
        res.json(production);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Delete a production set (DRAFT only)
 * @route   DELETE /api/productions/:id
 * @access  Private
 */
export const deleteProduction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const production = await Production.findById(id);
        if (!production) {
            res.status(404).json({ message: 'Production set not found' });
            return;
        }
        if (production.status !== 'DRAFT') {
            res.status(400).json({ message: 'Only DRAFT productions can be deleted' });
            return;
        }
        await production.deleteOne();
        res.json({ message: 'Production deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Export production metadata (CSV)
 * @route   GET /api/productions/:id/export
 * @access  Private
 */
export const exportProduction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const production = await Production.findById(id).populate({
            path: 'documents.documentId',
            populate: { path: 'custodianId' }
        });

        if (!production) {
            res.status(404).json({ message: 'Production set not found' });
            return;
        }

        const headers = [
            'Bates Number',
            'Document ID',
            'Doc Number',
            'Filename',
            'File Type',
            'File Size (Bytes)',
            'Custodian',
            'Document Date',
            'Privilege Status',
            'Relevance Status'
        ];

        const rows = (production.documents as any[]).map((pDoc: any) => {
            const doc = pDoc.documentId;
            const custodian = doc?.custodianId?.name || 'Unknown';
            const date = doc?.documentDate ? new Date(doc.documentDate).toISOString().split('T')[0] : '';

            return [
                pDoc.batesNumber || '',
                doc?._id?.toString() || '',
                doc?.docNumber || '',
                doc?.filename || '',
                doc?.fileType || '',
                doc?.fileSize ?? '',
                custodian,
                date,
                doc?.coding?.privilegeStatus || '',
                doc?.coding?.relevanceStatus || ''
            ];
        });

        const csv = stringifyCSV(headers, rows, true);
        const safeSetName = String(production.setName)
            .replace(/[^a-zA-Z0-9-_]+/g, '_')
            .replace(/^_+|_+$/g, '') || 'production';

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${safeSetName}_metadata.csv"`);
        res.status(200).send(csv);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get productions for a case
 * @route   GET /api/cases/:caseId/productions
 * @access  Private
 */
export const getProductionsByCase = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { caseId } = req.params;
        const productions = await Production.find({ caseId: caseId as any }).sort({ createdAt: -1 });
        res.json(productions);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get single production by ID
 * @route   GET /api/productions/:id
 * @access  Private
 */
export const getProductionById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const production = await Production.findById(id).populate('documents.documentId');
        if (!production) {
            res.status(404).json({ message: 'Production set not found' });
            return;
        }
        res.json(production);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Mark production as produced (final state after approval)
 * @route   PUT /api/productions/:id/produce
 * @access  Private (Partner/Admin)
 */
export const markAsProduced = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const user = req.user as IUserDocument;

        if (user.role !== 'PARTNER' && user.role !== 'ADMIN') {
            res.status(403).json({ message: 'Only Partners or Admins can mark productions as produced' });
            return;
        }

        const production = await Production.findById(id);
        if (!production) {
            res.status(404).json({ message: 'Production set not found' });
            return;
        }

        if (production.status !== 'APPROVED') {
            res.status(400).json({ message: 'Only APPROVED productions can be marked as produced' });
            return;
        }

        production.status = 'PRODUCED';
        production.producedAt = new Date();
        await production.save();

        res.json(production);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
