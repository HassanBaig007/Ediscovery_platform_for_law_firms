import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/authMiddleware';
import Case from '../models/Case';
import Document from '../models/Document';
import User, { IUserDocument } from '../models/User';
import Notification from '../models/Notification';
import AuditLog from '../models/AuditLog';
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

        if (!populatedCase) {
            res.status(500).json({ message: 'Failed to retrieve created case' });
            return;
        }

        console.log('[createCase] Created case:', populatedCase.caseName, 'MongoDB _id:', populatedCase._id);
        
        // Explicitly convert to JSON to ensure toJSON transform is applied
        const caseData = populatedCase.toJSON() as any;
        if (caseData.team) {
            caseData.team = caseData.team.filter((member: any) => member.user !== null && member.user !== undefined);
        }
        console.log('[createCase] Transformed case data, id field:', caseData.id);
        
        res.status(201).json(caseData);
    } catch (error: any) {
        console.error('[createCase] Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all cases (filtered by role)
// @route   GET /api/cases
// @access  Private
export const getCases = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        console.log('[getCases] Database:', mongoose.connection.db?.databaseName);
        console.log('[getCases] Connection state:', mongoose.connection.readyState);
        
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
            .populate('createdBy', 'firstName lastName email')
            .populate('team.user', 'firstName lastName email role')
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

        const caseDataList = cases.map(caseItem => {
            const caseData = caseItem.toJSON() as any;
            if (caseData.team) {
                caseData.team = caseData.team.filter((member: any) => member.user !== null && member.user !== undefined);
            }
            return caseData;
        });

        res.json({
            cases: caseDataList,
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
        console.log('[getCaseById] Fetching case with ID:', id);
        
        // Don't apply synthetic filter when fetching by ID - if user has the ID, they should access it
        const caseItem = await Case.findById(id)
            .populate('createdBy', 'firstName lastName email')
            .populate('team.user', 'firstName lastName email role');
        
        if (!caseItem) {
            console.log('[getCaseById] Case not found:', id);
            res.status(404).json({ message: 'Case not found' });
            return;
        }
        
        console.log('[getCaseById] Case found:', caseItem.caseName, 'ID:', caseItem._id);
        
        const user = req.user as IUserDocument;
        
        // Check access: Admin, Partner, or Team Member
        const isTeamMember = caseItem.team.some(member => {
            const memberUser: any = member.user;
            if (!memberUser) return false;
            const memberId = memberUser._id ? memberUser._id.toString() : memberUser.toString();
            return memberId === user._id.toString();
        });
        
        if (user.role !== 'ADMIN' && user.role !== 'PARTNER' && !isTeamMember) {
            console.log('[getCaseById] Access denied for user:', user.email);
            res.status(403).json({ message: 'Not authorized to view this case' });
            return;
        }
        
        console.log('[getCaseById] Access granted, returning case data');
        // Explicitly convert to JSON to ensure toJSON transform is applied
        const caseData = caseItem.toJSON() as any;
        if (caseData.team) {
            caseData.team = caseData.team.filter((member: any) => member.user !== null && member.user !== undefined);
        }
        res.json(caseData);
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
            if (!memberUser) return false;
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
        const caseData = updatedCase.toJSON() as any;
        if (caseData.team) {
            caseData.team = caseData.team.filter((member: any) => member.user !== null && member.user !== undefined);
        }
        res.json(caseData);
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

/**
 * @desc    Get case-specific activity
 * @route   GET /api/cases/:id/activity
 * @access  Private (Team member/Admin/Partner)
 */
export const getCaseActivity = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id: caseId } = req.params;
        const { limit = '20' } = req.query;
        const limitNum = Number(limit);

        const caseItem = await Case.findById(caseId);
        if (!caseItem) {
            res.status(404).json({ message: 'Case not found' });
            return;
        }

        const user = req.user as IUserDocument;
        const isTeamMember = caseItem.team.some(member => {
            const memberUser: any = member.user;
            if (!memberUser) return false;
            const memberId = memberUser._id ? memberUser._id.toString() : memberUser.toString();
            return memberId === user._id.toString();
        });

        if (user.role !== 'ADMIN' && user.role !== 'PARTNER' && !isTeamMember) {
            res.status(403).json({ message: 'Not authorized to view this case activity' });
            return;
        }

        const caseDocs = await Document.find({ caseId }).select('_id');
        const caseDocIds = caseDocs.map((doc: any) => doc._id.toString());

        // Fetch audit logs related to this case or to documents uploaded in this case
        const logs = await AuditLog.find({
            $or: [
                { entityId: caseId },
                { entityType: 'document', entityId: { $in: caseDocIds } },
                { details: { $regex: caseId, $options: 'i' } }
            ]
        })
        .populate('userId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .limit(limitNum);

        const formatActivityDescription = (log: any) => {
            const details = log.details || {};
            const filename = details.filename || details.fileName || 'document';
            const caseName = caseItem.caseName;

            switch (log.action) {
                case 'UPLOAD':
                    return `Uploaded ${filename}${caseName ? ` to ${caseName}` : ''}`;
                case 'DOWNLOAD':
                    return `Downloaded ${filename}`;
                case 'VIEW':
                    return details.preview ? `Previewed ${filename}` : `Viewed ${filename}`;
                case 'UPDATE':
                    if (log.entityType === 'document') {
                        return `Updated coding for ${filename}`;
                    }
                    if (log.entityType === 'Case') {
                        return `Updated case details for ${caseName}`;
                    }
                    return `Updated ${log.entityType}`;
                case 'CREATE':
                    if (log.entityType === 'document') {
                        return `Created ${filename}`;
                    }
                    if (log.entityType === 'Case') {
                        return `Created case ${caseName}`;
                    }
                    return `Created ${log.entityType}`;
                case 'DELETE':
                    return `Deleted ${log.entityType}`;
                default:
                    return `${log.action} ${log.entityType}`;
            }
        };

        const formattedLogs = logs.map((log: any) => {
            const populatedUser = log.userId as any;
            return {
                id: (log as any)._id,
                userId: populatedUser?._id || log.userId,
                userName: populatedUser 
                    ? `${populatedUser.firstName} ${populatedUser.lastName}`
                    : 'Unknown',
                userEmail: populatedUser?.email || '',
                action: log.action,
                entityType: log.entityType,
                entityId: log.entityId,
                details: log.details,
                ipAddress: log.ipAddress,
                timestamp: (log as any).createdAt,
                caseName: caseItem.caseName,
                description: formatActivityDescription(log)
            };
        });

        res.json(formattedLogs);
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
        console.log('[addTeamMember] Adding user:', userId, 'with role:', role);
        
        const caseItem = await Case.findById(req.params.id);

        if (!caseItem) {
            res.status(404).json({ message: 'Case not found' });
            return;
        }

        const user = req.user as IUserDocument;
        const isLead = caseItem.team.some(member => {
            const memberUser: any = member.user;
            if (!memberUser) return false;
            return memberUser.toString() === user._id.toString() && member.role === 'LEAD';
        });

        if (user.role !== 'ADMIN' && !isLead) {
            res.status(403).json({ message: 'Not authorized to manage team' });
            return;
        }

        // Check if user already in team
        if (caseItem.team.some(member => {
            const memberUser: any = member.user;
            if (!memberUser) return false;
            return memberUser.toString() === userId;
        })) {
            res.status(400).json({ message: 'User already in team' });
            return;
        }

        // Verify the user exists
        const userToAdd = await User.findById(userId);
        if (!userToAdd) {
            console.log('[addTeamMember] User not found:', userId);
            res.status(404).json({ message: 'User not found' });
            return;
        }
        console.log('[addTeamMember] User found:', userToAdd.email);

        caseItem.team.push({
            user: new mongoose.Types.ObjectId(userId) as any,
            role,
            assignedAt: new Date()
        } as any);
        await caseItem.save();
        console.log('[addTeamMember] Team member added, team size:', caseItem.team.length);

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
        console.log('[addTeamMember] Populated case, team:', updatedCase?.team.map((m: any) => ({
            user: m.user ? `${m.user.firstName} ${m.user.lastName}` : 'NULL',
            role: m.role
        })));
        
        if (!updatedCase) {
            res.status(404).json({ message: 'Case not found' });
            return;
        }
        const caseData = updatedCase.toJSON() as any;
        if (caseData.team) {
            caseData.team = caseData.team.filter((member: any) => member.user !== null && member.user !== undefined);
        }
        res.json(caseData);
    } catch (error: any) {
        console.error('[addTeamMember] Error:', error);
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
            if (!memberUser) return false;
            return memberUser.toString() === user._id.toString() && member.role === 'LEAD';
        });

        if (user.role !== 'ADMIN' && !isLead) {
            res.status(403).json({ message: 'Not authorized to manage team' });
            return;
        }

        // Prevent removing the last LEAD
        const memberToRemove = caseItem.team.find(m => {
            const memberUser: any = m.user;
            if (!memberUser) return false;
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
            if (!memberUser) return false;
            return memberUser.toString() !== userId;
        });
        await caseItem.save();

        const updatedCase = await Case.findById(id).populate('team.user', 'firstName lastName email role');
        if (!updatedCase) {
            res.status(404).json({ message: 'Case not found' });
            return;
        }
        const caseData = updatedCase.toJSON() as any;
        if (caseData.team) {
            caseData.team = caseData.team.filter((member: any) => member.user !== null && member.user !== undefined);
        }
        res.json(caseData);
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

        const teamUserIds = caseItem.team
            .map(m => m.user)
            .filter(user => user !== null && user !== undefined);

        const users = await User.find({
            _id: { $nin: teamUserIds },
            isActive: true
        }).select('firstName lastName email role');

        res.json(users);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
