import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Case from '../models/Case';
import Document from '../models/Document';
import User from '../models/User';
import { applyNonSyntheticCaseFilter, applyNonSyntheticDocumentFilter } from '../utils/syntheticFilters';

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/dashboard/stats
 * @access  Private
 */
export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!._id;
        const userRole = req.user!.role;

        let activeCases: number;
        let totalDocuments = 0;
        let pendingReview = 0;

        if (userRole === 'ADMIN') {
            // Admin sees all cases
            activeCases = await Case.countDocuments(applyNonSyntheticCaseFilter({ status: 'ACTIVE' }));
            
            const allCases = await Case.find(applyNonSyntheticCaseFilter({ status: 'ACTIVE' })).select('_id');
            const caseIds = allCases.map(c => c._id);
            
            if (caseIds.length > 0) {
                totalDocuments = await Document.countDocuments({ caseId: { $in: caseIds } });
                pendingReview = await Document.countDocuments({ 
                    caseId: { $in: caseIds },
                    'coding.reviewedAt': { $exists: false }
                });
            }
        } else {
            // Non-admin sees their assigned cases
            const userCases = await Case.find(applyNonSyntheticCaseFilter({
                'team.user': userId,
                status: 'ACTIVE'
            }));
            
            activeCases = userCases.length;
            
            const caseIds = userCases.map(c => c._id);
            if (caseIds.length > 0) {
                totalDocuments = await Document.countDocuments({ caseId: { $in: caseIds } });
                pendingReview = await Document.countDocuments({ 
                    caseId: { $in: caseIds },
                    'coding.reviewedAt': { $exists: false }
                });
            }
        }

        res.json({
            activeCases,
            totalDocuments,
            pendingReview
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        res.status(500).json({ message });
    }
};

/**
 * @desc    Get recent activity
 * @route   GET /api/dashboard/activity
 * @access  Private
 */
export const getRecentActivity = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!._id;
        const userRole = req.user!.role;
        const { limit = 10 } = req.query;

        const limitNum = Number(limit);

        let caseIds: any[] = [];

        if (userRole === 'ADMIN') {
            const allCases = await Case.find(applyNonSyntheticCaseFilter()).select('_id');
            caseIds = allCases.map(c => c._id);
        } else {
            const userCases = await Case.find(applyNonSyntheticCaseFilter({ 'team.user': userId })).select('_id');
            caseIds = userCases.map(c => c._id);
        }

        if (caseIds.length === 0) {
            res.json([]);
            return;
        }

        // Get recent documents
        const recentDocs = await Document.find(
            applyNonSyntheticDocumentFilter({ caseId: { $in: caseIds } })
        )
            .sort({ createdAt: -1 })
            .limit(limitNum)
            .populate('caseId', 'caseName')
            .select('filename fileType createdAt coding.reviewedAt');

        const activity = recentDocs.map(doc => {
            const action = doc.coding?.reviewedAt ? 'Reviewed' : 'Uploaded';
            const caseName = doc.caseId?.caseName;
            const desc = caseName
                ? `${action} ${doc.filename} in ${caseName}`
                : `${action} ${doc.filename}`;
            return {
                type: doc.coding?.reviewedAt ? 'REVIEWED' : 'UPLOADED',
                description: desc,
                timestamp: doc.coding?.reviewedAt || doc.createdAt,
                caseId: doc.caseId?._id,
                caseName
            };
        });

        res.json(activity);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        res.status(500).json({ message });
    }
};

/**
 * @desc    Get overview for all cases
 * @route   GET /api/dashboard/overview
 * @access  Private
 */
export const getOverview = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!._id;
        const userRole = req.user!.role;

        let cases: any[];

        if (userRole === 'ADMIN') {
            cases = await Case.find(applyNonSyntheticCaseFilter({ status: 'ACTIVE' }))
                .select('caseName status createdAt')
                .sort({ createdAt: -1 });
        } else {
            const userCases = await Case.find(applyNonSyntheticCaseFilter({
                'team.user': userId,
                status: 'ACTIVE'
            }))
            .select('caseName status createdAt')
            .sort({ createdAt: -1 });
            cases = userCases;
        }

        // Get document counts for each case
        const overview = await Promise.all(
            cases.map(async (caseItem) => {
                const totalDocs = await Document.countDocuments({ caseId: caseItem._id });
                const reviewedDocs = await Document.countDocuments({ 
                    caseId: caseItem._id,
                    'coding.reviewedAt': { $exists: true }
                });

                return {
                    _id: caseItem._id,
                    caseName: caseItem.caseName,
                    status: caseItem.status,
                    totalDocuments: totalDocs,
                    reviewedDocuments: reviewedDocs,
                    progress: totalDocs > 0 ? Math.round((reviewedDocs / totalDocs) * 100) : 0
                };
            })
        );

        res.json(overview);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        res.status(500).json({ message });
    }
};
