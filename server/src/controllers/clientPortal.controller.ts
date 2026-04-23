import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Case from '../models/Case';
import ClientPortalShare from '../models/ClientPortalShare';
import { logAction } from '../utils/audit.util';

export const createCaseShare = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { caseId, recipientEmail, message } = req.body;
        if (!caseId || !recipientEmail) {
            res.status(400).json({ message: 'caseId and recipientEmail are required' });
            return;
        }

        const caseItem = await Case.findById(caseId).select('caseName');
        if (!caseItem) {
            res.status(404).json({ message: 'Case not found' });
            return;
        }

        const share = await ClientPortalShare.create({
            caseId,
            sharedBy: req.user!._id,
            recipientEmail,
            message,
            status: 'SENT'
        });

        await logAction(req.user!._id, 'CREATE', 'ClientPortalShare', share._id, {
            caseId,
            recipientEmail
        }, req.ip);

        res.status(201).json(share);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getCaseShares = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { caseId } = req.params;
        const shares = await ClientPortalShare.find({ caseId }).sort({ createdAt: -1 });
        res.json(shares);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const revokeCaseShare = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { shareId } = req.params;
        const share = await ClientPortalShare.findById(shareId);
        if (!share) {
            res.status(404).json({ message: 'Share not found' });
            return;
        }

        share.status = 'REVOKED';
        await share.save();

        await logAction(req.user!._id, 'DELETE', 'ClientPortalShare', share._id, {
            caseId: share.caseId,
            recipientEmail: share.recipientEmail
        }, req.ip);

        res.json(share);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
