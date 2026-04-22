import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/authMiddleware';
import Case from '../models/Case';
import User, { IUserDocument } from '../models/User';
import Notification from '../models/Notification';
import { applyNonSyntheticCaseFilter } from '../utils/syntheticFilters';

// @desc    Create a new case
// @route   POST /api/cases
// @access  Private (Partner/Admin)
export const createCase = async (req: AuthRequest, res: Response): Promise<void> => {
    const user = req.user!;
    try {
        if (user.role !== 'ADMIN' && user.role !== 'PARTNER') {
            res.status(403).json({ message: 'Not authorized to create cases' });
            return;
        }

        const { caseNumber, caseName, clientName, opposingParty, description } = req.body;

        // Validation handled by Mongoose usually, but we can add explicit checks
        const caseExists = await Case.findOne({ caseNumber });
        if (caseExists) {
            res.status(400).json({ message: 'Case number already exists' });
            return;
        }

        const newCase = await Case.create({
            caseNumber,
            caseName,
            clientName,
            opposingParty,
            description,
            createdBy: user._id,
            team: [{
                user: user._id,
                role: 'LEAD',
                assignedAt: new Date()
            }]
        });

        // Populate the team.user to return full details
        const populatedCase = await Case.findById(newCase._id)
            .populate('team.user', 'firstName lastName email role');

        res.status(201).json(populatedCase);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all cases (filtered by role)
// @route   GET /api/cases
// @access  Private
export const getCases = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const {
            status,
            page = 1,
            limit = 10,
            search = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        let baseQuery: Record<string, unknown> = {};

        const searchQuery = String(search).trim();

        const user = req.user!;

        // Role-based filtering
        if (user.role !== 'ADMIN' && user.role !== 'PARTNER') {
            // Associates/Paralegals see only assigned cases
            baseQuery['team.user'] = user._id;
        }

        baseQuery = applyNonSyntheticCaseFilter(baseQuery);
        const query: Record<string, unknown> = { ...baseQuery };

        // Status filter
        if (status && status !== 'All') {
            query.status = status;
        }

        if (searchQuery) {
            query.$or = [
                { caseName: { $regex: searchQuery, $options: 'i' } },
                { clientName: { $regex: searchQuery, $options: 'i' } },
                { caseNumber: { $regex: searchQuery, $options: 'i' } }
            ];
        }

        const sortField = ['caseName', 'clientName', 'status', 'createdAt'].includes(String(sortBy))
            ? String(sortBy)
            : 'createdAt';
        const sortDirection = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;
        const sortOptions: Record<string, 1 | -1> = { [sortField]: sortDirection };

        const cases = await Case.find(query)
            .populate('createdBy', 'firstName lastName')
            .populate('team.user', 'firstName lastName email')
            .sort(sortOptions)
            .skip(skip)
            .limit(limitNum);

        const [total, totalAll, totalActive, totalClosed, totalArchived] = await Promise.all([
            Case.countDocuments(query),
            Case.countDocuments(baseQuery),
            Case.countDocuments({ ...baseQuery, status: 'ACTIVE' }),
            Case.countDocuments({ ...baseQuery, status: 'CLOSED' }),
            Case.countDocuments({ ...baseQuery, status: 'ARCHIVED' })
        ]);

        res.json({
            cases,
            page: pageNum,
            pages: Math.ceil(total / limitNum),
            total,
            statusCounts: {
                total: totalAll,
                active: totalActive,
                closed: totalClosed,
                archived: totalArchived
            }
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single case by ID
// @route   GET /api/cases/:id
// @access  Private (Team member/Admin/Partner)
export const getCaseById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const caseItem = await Case.findOne(applyNonSyntheticCaseFilter({ _id: id }))
            .populate('createdBy', 'firstName lastName')
            .populate('team.user', 'firstName lastName email role');

        if (!caseItem) {
            res.status(404).json({ message: 'Case not found' });
            return;
        }

        const user = req.user as IUserDocument;

        // Check access: Admin, Partner, or Team Member
        const isTeamMember = caseItem.team.some(member => {
            const memberUser: any = member.user;
            const memberId = memberUser._id ? memberUser._id.toString() : memberUser.toString();
            return memberId === user._id.toString();
        });

        if (user.role !== 'ADMIN' && user.role !== 'PARTNER' && !isTeamMember) {
            res.status(403).json({ message: 'Not authorized to view this case' });
            return;
        }

        res.json(caseItem);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update case metadata
// @route   PUT /api/cases/:id
// @access  Private (LEAD/Admin)
export const updateCase = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { caseName, clientName, description, status } = req.body;
        const caseItem = await Case.findById(req.params.id);

        if (!caseItem) {
            res.status(404).json({ message: 'Case not found' });
            return;
        }

        const user = req.user as IUserDocument;

        // Check permission: Admin or Lead
        const isLead = caseItem.team.some(member => {
            const memberUser: any = member.user;
            return memberUser.toString() === user._id.toString() && member.role === 'LEAD';
        });

        if (user.role !== 'ADMIN' && !isLead) {
            res.status(403).json({ message: 'Not authorized to update this case' });
            return;
        }

        caseItem.caseName = caseName || caseItem.caseName;
        caseItem.clientName = clientName || caseItem.clientName;
        caseItem.description = description || caseItem.description;
        caseItem.status = status || caseItem.status;

        const updatedCase = await caseItem.save();
        res.json(updatedCase);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete case (Soft delete)
// @route   DELETE /api/cases/:id
// @access  Private (Admin only)
export const deleteCase = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const caseItem = await Case.findById(req.params.id);

        if (!caseItem) {
            res.status(404).json({ message: 'Case not found' });
            return;
        }

        // Only Admin can delete (enforced by route middleware usually, but good to check here too)
        if (req.user!.role !== 'ADMIN') {
            res.status(403).json({ message: 'Not authorized to delete cases' });
            return;
        }

        // Soft delete
        caseItem.status = 'ARCHIVED';
        await caseItem.save();

        res.json({ message: 'Case archived successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add team member
// @route   POST /api/cases/:id/team
// @access  Private (LEAD only)
export const addTeamMember = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId, role } = req.body;
        const caseItem = await Case.findById(req.params.id);

        if (!caseItem) {
            res.status(404).json({ message: 'Case not found' });
            return;
        }

        const user = req.user as IUserDocument;
        const isLead = caseItem.team.some(member => {
            const memberUser: any = member.user;
            return memberUser.toString() === user._id.toString() && member.role === 'LEAD';
        });

        if (user.role !== 'ADMIN' && !isLead) {
            res.status(403).json({ message: 'Not authorized to manage team' });
            return;
        }

        // Check if user already in team
        if (caseItem.team.some(member => {
            const memberUser: any = member.user;
            return memberUser.toString() === userId;
        })) {
            res.status(400).json({ message: 'User already in team' });
            return;
        }

        caseItem.team.push({
            user: new mongoose.Types.ObjectId(userId) as any,
            role,
            assignedAt: new Date()
        } as any);
        await caseItem.save();

        // Notify the added user (fire-and-forget)
        Notification.create({
            userId: new mongoose.Types.ObjectId(userId),
            type: 'CASE',
            title: 'Added to case',
            message: `You have been added to case: ${caseItem.caseName}`,
            link: `/cases/${caseItem._id}`,
            isRead: false,
        }).catch(() => {});

        const updatedCase = await Case.findById(req.params.id).populate('team.user', 'firstName lastName email role');
        res.json(updatedCase);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Remove team member
// @route   DELETE /api/cases/:id/team/:userId
// @access  Private (LEAD only)
export const removeTeamMember = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id, userId } = req.params;
        const caseItem = await Case.findById(id);

        if (!caseItem) {
            res.status(404).json({ message: 'Case not found' });
            return;
        }

        const user = req.user as IUserDocument;
        const isLead = caseItem.team.some(member => {
            const memberUser: any = member.user;
            return memberUser.toString() === user._id.toString() && member.role === 'LEAD';
        });

        if (user.role !== 'ADMIN' && !isLead) {
            res.status(403).json({ message: 'Not authorized to manage team' });
            return;
        }

        // Prevent removing the last LEAD
        const memberToRemove = caseItem.team.find(m => {
            const memberUser: any = m.user;
            return memberUser.toString() === userId;
        });

        if (memberToRemove?.role === 'LEAD') {
            const leadCount = caseItem.team.filter(m => m.role === 'LEAD').length;
            if (leadCount <= 1) {
                res.status(400).json({ message: 'Cannot remove the last LEAD' });
                return;
            }
        }

        caseItem.team = caseItem.team.filter(member => {
            const memberUser: any = member.user;
            return memberUser.toString() !== userId;
        });
        await caseItem.save();

        const updatedCase = await Case.findById(id).populate('team.user', 'firstName lastName email role');
        res.json(updatedCase);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get available users (not in team)
// @route   GET /api/cases/:id/available-users
// @access  Private
export const getAvailableUsers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const caseItem = await Case.findById(req.params.id);
        if (!caseItem) {
            res.status(404).json({ message: 'Case not found' });
            return;
        }

        const teamUserIds = caseItem.team.map(m => m.user);

        const users = await User.find({
            _id: { $nin: teamUserIds },
            isActive: true
        }).select('firstName lastName email role');

        res.json(users);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
