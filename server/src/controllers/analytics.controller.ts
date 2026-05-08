import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/authMiddleware';
import Document from '../models/Document';
import Case from '../models/Case';
import User from '../models/User';
import Custodian from '../models/Custodian';
import {
    applyNonSyntheticCaseFilter,
    applyNonSyntheticUserFilter,
    getSyntheticCaseIds,
    getSyntheticUserIds
} from '../utils/syntheticFilters';

const toObjectId = (id: string) => mongoose.Types.ObjectId.createFromHexString(id);

const FILE_TYPE_ORDER = ['PDF', 'Email', 'Word', 'Spreadsheet', 'Other'] as const;

const normalizeFileType = (fileType: string): (typeof FILE_TYPE_ORDER)[number] => {
    const normalized = fileType.toLowerCase();

    if (normalized.includes('pdf')) {
        return 'PDF';
    }

    if (
        normalized.includes('message')
        || normalized.includes('rfc822')
        || normalized.includes('eml')
        || normalized.includes('msg')
        || normalized.includes('mail')
    ) {
        return 'Email';
    }

    if (
        normalized.includes('word')
        || normalized.includes('doc')
        || normalized.includes('officedocument.wordprocessingml')
    ) {
        return 'Word';
    }

    if (
        normalized.includes('excel')
        || normalized.includes('sheet')
        || normalized.includes('spreadsheet')
        || normalized.includes('xls')
    ) {
        return 'Spreadsheet';
    }

    return 'Other';
};

const dayKey = (date: Date) => date.toISOString().slice(0, 10);

const buildLast7DayKeys = (): string[] => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);

    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return dayKey(date);
    });
};

const getWeeklyTrend = async (excludedCaseIds: string[]): Promise<number[]> => {
    const trend: number[] = [];
    const caseFilter = excludedCaseIds.length > 0
        ? { caseId: { $nin: excludedCaseIds } }
        : {};

    for (let weekIndex = 6; weekIndex >= 0; weekIndex -= 1) {
        const weekStart = new Date();
        weekStart.setHours(0, 0, 0, 0);
        weekStart.setDate(weekStart.getDate() - (weekIndex * 7 + 6));

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        // Keep this lightweight: one count query per week for deterministic weekly trend buckets.
        const reviewedCount = await Document.countDocuments({
            'coding.reviewedAt': { $gte: weekStart, $lt: weekEnd },
            ...caseFilter
        });

        trend.push(reviewedCount);
    }

    return trend;
};

/**
 * @desc    Get platform-wide analytics
 * @route   GET /api/analytics
 * @access  Private
 */
export const getPlatformAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // Range is accepted for forward compatibility with richer time-window filtering.
        // Current implementation returns stable 7-day/7-week buckets for dashboard charts.
        const _range = req.query.range as string | undefined;
        void _range;

        const syntheticCaseIds = await getSyntheticCaseIds();
        const syntheticUserIds = await getSyntheticUserIds();
        const caseFilter = syntheticCaseIds.length > 0
            ? { caseId: { $nin: syntheticCaseIds } }
            : {};

        const [
            totalCases,
            activeCases,
            totalDocuments,
            reviewedDocuments,
            totalUsers,
            activeUsers,
            confidentialYes
        ] = await Promise.all([
            Case.countDocuments(applyNonSyntheticCaseFilter()),
            Case.countDocuments(applyNonSyntheticCaseFilter({ status: 'ACTIVE' })),
            Document.countDocuments({ ...caseFilter }),
            Document.countDocuments({ 'coding.reviewedAt': { $exists: true }, ...caseFilter }),
            User.countDocuments(applyNonSyntheticUserFilter()),
            User.countDocuments(applyNonSyntheticUserFilter({ isActive: true })),
            Document.countDocuments({ 'coding.isConfidential': true, ...caseFilter })
        ]);

        const activeCaseDocs = await Case.find(applyNonSyntheticCaseFilter({ status: 'ACTIVE' }))
            .select('_id caseName')
            .sort({ createdAt: -1 })
            .limit(8)
            .lean();

        const byCase = await Promise.all(
            activeCaseDocs.map(async (caseItem) => {
                const [caseTotal, caseReviewed] = await Promise.all([
                    Document.countDocuments({ caseId: caseItem._id }),
                    Document.countDocuments({
                        caseId: caseItem._id,
                        'coding.reviewedAt': { $exists: true }
                    })
                ]);

                return {
                    name: caseItem.caseName,
                    total: caseTotal,
                    reviewed: caseReviewed,
                    percentage: caseTotal > 0 ? Number(((caseReviewed / caseTotal) * 100).toFixed(1)) : 0
                };
            })
        );

        const dayKeys = buildLast7DayKeys();
        const dayWindowStart = new Date(dayKeys[0]);

        const [uploadedAgg, reviewedAgg] = await Promise.all([
            Document.aggregate<{ _id: string; count: number }>([
                { $match: { createdAt: { $gte: dayWindowStart }, ...caseFilter } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        count: { $sum: 1 }
                    }
                }
            ]),
            Document.aggregate<{ _id: string; count: number }>([
                { $match: { 'coding.reviewedAt': { $gte: dayWindowStart }, ...caseFilter } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$coding.reviewedAt' } },
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        const uploadedMap = new Map(uploadedAgg.map((item) => [item._id, item.count]));
        const reviewedMap = new Map(reviewedAgg.map((item) => [item._id, item.count]));

        const uploads = dayKeys.map((key) => uploadedMap.get(key) ?? 0);
        const reviews = dayKeys.map((key) => reviewedMap.get(key) ?? 0);

        const weeklyTrend = await getWeeklyTrend(syntheticCaseIds);

        const reviewerAgg = await Document.aggregate<{ _id: mongoose.Types.ObjectId | null; reviews: number }>([
            { $match: { 'coding.reviewedBy': { $exists: true, $ne: null }, ...caseFilter } },
            { $group: { _id: '$coding.reviewedBy', reviews: { $sum: 1 } } },
            { $sort: { reviews: -1 } },
            { $limit: 5 }
        ]);

        const reviewerIds = reviewerAgg
            .map((item) => item._id)
            .filter((id): id is mongoose.Types.ObjectId => id !== null);

        const reviewerUserFilter: Record<string, unknown> = { _id: { $in: reviewerIds } };
        if (syntheticUserIds.length > 0) {
            reviewerUserFilter._id = { $in: reviewerIds, $nin: syntheticUserIds };
        }

        const reviewerUsers = await User.find(reviewerUserFilter)
            .select('firstName lastName')
            .lean();

        const reviewerNameMap = new Map(
            reviewerUsers.map((user) => [user._id.toString(), `${user.firstName} ${user.lastName}`])
        );

        const topReviewers = await Promise.all(
            reviewerAgg
                .filter((item): item is { _id: mongoose.Types.ObjectId; reviews: number } => item._id !== null)
                .map(async (item) => {
                    const docs = await Document.find({
                        'coding.reviewedBy': item._id,
                        'coding.reviewedAt': { $exists: true },
                        ...caseFilter
                    })
                        .select('createdAt coding.reviewedAt coding.privilegeStatus coding.relevanceStatus')
                        .lean();

                    let totalMinutes = 0;
                    let completeCodingCount = 0;

                    docs.forEach((doc) => {
                        if (doc.coding?.reviewedAt) {
                            const reviewedAt = new Date(doc.coding.reviewedAt).getTime();
                            const createdAt = new Date(doc.createdAt).getTime();
                            const delta = Math.max(0, reviewedAt - createdAt);
                            totalMinutes += delta / 1000 / 60;
                        }

                        if (doc.coding?.privilegeStatus && doc.coding?.relevanceStatus) {
                            completeCodingCount += 1;
                        }
                    });

                    return {
                        name: reviewerNameMap.get(item._id.toString()) ?? 'Unknown Reviewer',
                        reviews: item.reviews,
                        hours: Number((totalMinutes / 60).toFixed(1)),
                        codingCompleteness: item.reviews > 0 ? Number(((completeCodingCount / item.reviews) * 100).toFixed(1)) : 0
                    };
                })
        );

        const rawTypeCounts = await Document.aggregate<{ _id: string | null; count: number }>([
            { $match: { ...caseFilter } },
            { $group: { _id: '$fileType', count: { $sum: 1 } } }
        ]);

        const bucketCounts: Record<(typeof FILE_TYPE_ORDER)[number], number> = {
            PDF: 0,
            Email: 0,
            Word: 0,
            Spreadsheet: 0,
            Other: 0
        };

        rawTypeCounts.forEach((item) => {
            const bucket = normalizeFileType(item._id ?? '');
            bucketCounts[bucket] += item.count;
        });

        const byType = FILE_TYPE_ORDER.map((type) => ({
            type,
            count: bucketCounts[type],
            percentage: totalDocuments > 0 ? Number(((bucketCounts[type] / totalDocuments) * 100).toFixed(1)) : 0
        }));

        const custodianAgg = await Document.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
            { $match: { custodianId: { $exists: true, $ne: null }, ...caseFilter } },
            { $group: { _id: '$custodianId', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        const custodianIds = custodianAgg.map((item) => item._id);
        const custodians = await Custodian.find({ _id: { $in: custodianIds } })
            .select('name')
            .lean();
        const custodianNameMap = new Map(custodians.map((custodian) => [custodian._id.toString(), custodian.name]));

        const byCustodian = custodianAgg.map((item) => ({
            name: custodianNameMap.get(item._id.toString()) ?? 'Unknown Custodian',
            count: item.count
        }));

        const [relevantCount, notRelevantCount, privilegedCount, notPrivilegedCount] = await Promise.all([
            Document.countDocuments({ 'coding.relevanceStatus': { $in: ['HIGHLY_RELEVANT', 'RELEVANT'] }, ...caseFilter }),
            Document.countDocuments({ 'coding.relevanceStatus': { $in: ['NOT_RELEVANT', 'MARGINAL'] }, ...caseFilter }),
            Document.countDocuments({
                'coding.privilegeStatus': { $in: ['ATTORNEY_CLIENT', 'WORK_PRODUCT', 'NEEDS_REVIEW'] },
                ...caseFilter
            }),
            Document.countDocuments({ 'coding.privilegeStatus': 'NOT_PRIVILEGED', ...caseFilter })
        ]);

        res.json({
            overview: {
                totalCases,
                activeCases,
                totalDocuments,
                reviewedDocuments,
                totalUsers,
                activeUsers
            },
            reviewProgress: {
                byCase,
                dailyReviews: reviews,
                weeklyTrend
            },
            userActivity: {
                topReviewers
            },
            documentStats: {
                byType,
                byCustodian,
                codingStats: {
                    relevance: {
                        relevant: relevantCount,
                        notRelevant: notRelevantCount
                    },
                    privilege: {
                        privileged: privilegedCount,
                        notPrivileged: notPrivilegedCount
                    },
                    confidential: {
                        yes: confidentialYes,
                        no: Math.max(0, totalDocuments - confidentialYes)
                    }
                }
            },
            timeline: {
                uploads,
                reviews
            }
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        res.status(500).json({ message });
    }
};

/**
 * @desc    Get case analytics
 * @route   GET /api/cases/:caseId/analytics
 * @access  Private
 */
export const getCaseAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const caseIdParam = req.params.caseId;
        const caseId = Array.isArray(caseIdParam) ? caseIdParam[0] : caseIdParam;

        // Get case details - don't filter by synthetic when accessing by ID
        const caseItem = await Case.findById(caseId);
        if (!caseItem) {
            res.status(404).json({ message: 'Case not found' });
            return;
        }

        // Get document counts
        const totalDocuments = await Document.countDocuments({ caseId });
        const reviewedDocuments = await Document.countDocuments({
            caseId,
            'coding.reviewedAt': { $exists: true }
        });
        const pendingDocuments = totalDocuments - reviewedDocuments;

        // Relevance breakdown
        const relevanceBreakdown = await Document.aggregate([
            { $match: { caseId: toObjectId(caseId) } },
            { $group: { 
                _id: '$coding.relevanceStatus', 
                count: { $sum: 1 } 
            }}
        ]);

        // Privilege breakdown
        const privilegeBreakdown = await Document.aggregate([
            { $match: { caseId: toObjectId(caseId) } },
            { $group: { 
                _id: '$coding.privilegeStatus', 
                count: { $sum: 1 } 
            }}
        ]);

        // Format results
        const formatBreakdown = (results: { _id: string | null; count: number }[]) => {
            const formatted: Record<string, number> = {
                HIGHLY_RELEVANT: 0,
                RELEVANT: 0,
                NOT_RELEVANT: 0,
                MARGINAL: 0,
                NEEDS_REVIEW: 0
            };
            results.forEach(item => {
                if (item._id) {
                    formatted[item._id] = item.count;
                }
            });
            return formatted;
        };

        res.json({
            caseId,
            caseName: caseItem.caseName,
            totalDocuments,
            reviewedDocuments,
            pendingDocuments,
            reviewProgress: totalDocuments > 0 ? Math.round((reviewedDocuments / totalDocuments) * 100) : 0,
            relevanceBreakdown: formatBreakdown(relevanceBreakdown),
            privilegeBreakdown: formatBreakdown(privilegeBreakdown)
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        res.status(500).json({ message });
    }
};

/**
 * @desc    Get team performance metrics
 * @route   GET /api/cases/:caseId/analytics/team
 * @access  Private
 */
export const getTeamPerformance = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const caseIdParam = req.params.caseId;
        const caseId = Array.isArray(caseIdParam) ? caseIdParam[0] : caseIdParam;

        // Get all team members
        const caseItem = await Case.findById(caseId).populate('team.user', 'firstName lastName');
        if (!caseItem) {
            res.status(404).json({ message: 'Case not found' });
            return;
        }

        const teamPerformance = await Promise.all(
            caseItem.team.map(async (member) => {
                const docsReviewed = await Document.countDocuments({
                    caseId,
                    'coding.reviewedBy': member.user._id
                });

                // Get average time per document
                const reviewedDocs = await Document.find({
                    caseId,
                    'coding.reviewedBy': member.user._id,
                    'coding.reviewedAt': { $exists: true }
                }).select('coding.reviewedAt createdAt');

                let avgTimePerDoc = 0;
                if (reviewedDocs.length > 0) {
                    let totalTime = 0;
                    reviewedDocs.forEach((doc: any) => {
                        const reviewTime = new Date(doc.coding.reviewedAt).getTime();
                        const uploadTime = new Date(doc.createdAt).getTime();
                        totalTime += (reviewTime - uploadTime);
                    });
                    avgTimePerDoc = Math.round(totalTime / reviewedDocs.length / 1000 / 60); // in minutes
                }

                const user = member.user as any;
                return {
                    userId: user._id,
                    userName: `${user.firstName} ${user.lastName}`,
                    role: member.role,
                    documentsReviewed: docsReviewed,
                    avgTimePerDoc
                };
            })
        );

        res.json(teamPerformance);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        res.status(500).json({ message });
    }
};

/**
 * @desc    Get daily progress
 * @route   GET /api/cases/:caseId/analytics/progress
 * @access  Private
 */
export const getDailyProgress = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const caseIdParam = req.params.caseId;
        const caseId = Array.isArray(caseIdParam) ? caseIdParam[0] : caseIdParam;
        const { days = 30 } = req.query;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(days));

        const dailyProgress = await Document.aggregate([
            {
                $match: {
                    caseId: toObjectId(caseId),
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    uploaded: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const reviewedProgress = await Document.aggregate([
            {
                $match: {
                    caseId: toObjectId(caseId),
                    'coding.reviewedAt': { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$coding.reviewedAt' } },
                    reviewed: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Merge the results
        const merged: Record<string, { date: string; uploaded: number; reviewed: number }> = {};
        
        dailyProgress.forEach(item => {
            merged[item._id] = { date: item._id, uploaded: item.uploaded, reviewed: 0 };
        });
        
        reviewedProgress.forEach(item => {
            if (merged[item._id]) {
                merged[item._id].reviewed = item.reviewed;
            } else {
                merged[item._id] = { date: item._id, uploaded: 0, reviewed: item.reviewed };
            }
        });

        res.json(Object.values(merged).sort((a, b) => a.date.localeCompare(b.date)));
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        res.status(500).json({ message });
    }
};
