import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Document from '../models/Document';
import AuditLog from '../models/AuditLog';
import mongoose from 'mongoose';
import { logAction } from '../utils/audit.util';
import Case from '../models/Case';
import { createNotification } from './notification.controller';

// @desc    Get coding history
// @route   GET /api/documents/:id/coding-history
// @access  Private
export const getCodingHistory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        
        const document = await Document.findById(id).select('coding');
        if (!document) {
            res.status(404).json({ message: 'Document not found' });
            return;
        }

        // Query the append-only audit log for all coding events on this document.
        const auditEntries = await AuditLog.find({
            action: 'DOCUMENT_CODED',
            entityId: id
        })
            .populate('userId', 'firstName lastName email')
            .sort({ createdAt: 1 });

        const history = auditEntries.map((entry: any) => ({
            action: entry.action,
            timestamp: entry.createdAt,
            user: entry.userId,
            details: entry.details,
            ipAddress: entry.ipAddress
        }));

        res.json(history);
    } catch (error: any) {
        console.error('Coding History Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Review Queue (Next unreviewed document)
// @route   GET /api/cases/:caseId/review/queue
// @access  Private
export const getReviewQueue = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { caseId } = req.params;
        const { skipIds } = req.query; // IDs to skip (e.g. recently fetched but not coded?)

        // Logic: Find one document where 'coding.reviewedAt' is null (or undefined)
        // Sort by docNumber or priority

        let query: any = {
            caseId,
            'coding.reviewedAt': { $exists: false } // Unreviewed
        };

        if (skipIds) {
            const ids = (skipIds as string).split(',');
            query._id = { $nin: ids };
        }

        // Potential Optimization: Lock the document? 
        // For Phase 4, we use optimistic handling. 

        const document = await Document.findOne(query)
            .sort({ docNumber: 1 }) // First in, first out
            .populate('tags')
            .populate('custodianId');

        if (!document) {
            res.status(200).json(null); // Queue empty
            return;
        }

        // Log View
        await logAction(req.user!._id, 'VIEW', 'document', document._id, null, req.ip);

        res.json(document);
    } catch (error: any) {
        console.error('Queue Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get current user's assigned active cases for review queue landing
// @route   GET /api/review/my-queue
// @access  Private
export const getMyReviewQueueCases = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!._id;

        const assignedCases = await Case.find({
            status: 'ACTIVE',
            team: { $elemMatch: { user: userId, role: 'REVIEWER' } }
        })
            .sort({ createdAt: -1 })
            .select('caseName caseNumber status clientName');

        res.json(assignedCases);
    } catch (error: any) {
        console.error('My Review Queue Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Submit Coding
// @route   POST /api/documents/:id/code
// @access  Private
export const submitCoding = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const codingData = req.body; // { privilegeStatus, relevanceStatus, ... }

        const document = await Document.findById(id);
        if (!document) {
            res.status(404).json({ message: 'Document not found' });
            return;
        }

        // Update coding
        document.coding = {
            ...document.coding, // keep existing if any partial updates
            ...codingData,
            reviewedBy: req.user!._id,
            reviewedAt: new Date(),
            updatedAt: new Date()
        };

        // If 'issueTagIds' passed, update tags too
        if (codingData.issueTagIds && Array.isArray(codingData.issueTagIds)) {
            document.tags = codingData.issueTagIds;
        }

        await document.save();
        
        await logAction(req.user!._id, 'UPDATE', 'document', document._id, { coding: codingData }, req.ip);

        // Notify case leads about completed review (fire-and-forget)
        try {
            const caseRecord = await Case.findById(document.caseId).select('caseName team');
            if (caseRecord) {
                const leads = (caseRecord.team || [])
                    .filter((t: any) => t.role === 'LEAD' || t.role === 'PARTNER')
                    .map((t: any) => t.user?.toString())
                    .filter(Boolean);
                const reviewerName = `${req.user!.firstName} ${req.user!.lastName}`;
                for (const uid of leads) {
                    if (uid !== req.user!._id.toString()) {
                        createNotification(
                            uid,
                            'REVIEW',
                            'Document reviewed',
                            `${reviewerName} reviewed ${document.filename} in ${caseRecord.caseName}.`,
                            `/cases/${document.caseId}/review`,
                        ).catch(() => {});
                    }
                }
            }
        } catch { /* notification failure is non-critical */ }

        // Fetch NEXT document immediately for speed
        // Reuse getReviewQueue logic essentially, but tailored for response
        const { caseId } = document;

        const nextDoc = await Document.findOne({
            caseId: caseId as any,
            'coding.reviewedAt': { $exists: false },
            _id: { $ne: id as any }
        } as any)
            .sort({ docNumber: 1 })
            .populate('tags')
            .populate('custodianId');

        if (nextDoc) {
            await logAction(req.user!._id, 'VIEW', 'document', nextDoc._id, null, req.ip);
        }

        res.json({
            success: true,
            message: 'Coding saved',
            nextDocument: nextDoc ?? null
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
