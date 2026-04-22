import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import User from '../models/User';
import { applyNonSyntheticUserFilter } from '../utils/syntheticFilters';
import bcrypt from 'bcryptjs';

/**
 * @desc    Get all users
 * @route   GET /api/users
 * @access  Private (Admin)
 */
export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { page = 1, limit = 20, role } = req.query;
        
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        const query: Record<string, unknown> = applyNonSyntheticUserFilter();
        
        if (role) {
            query.role = role;
        }

        const users = await User.find(query)
            .select('-passwordHash')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        const total = await User.countDocuments(query);

        res.json({
            users,
            page: pageNum,
            pages: Math.ceil(total / limitNum),
            total
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        res.status(500).json({ message });
    }
};

/**
 * @desc    Get user by ID
 * @route   GET /api/users/:id
 * @access  Private (Admin)
 */
export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const user = await User.findById(id).select('-passwordHash');

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        res.json(user);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        res.status(500).json({ message });
    }
};

/**
 * @desc    Update user
 * @route   PUT /api/users/:id
 * @access  Private (Admin)
 */
export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { firstName, lastName, role, isActive } = req.body;

        const user = await User.findById(id);

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (role) user.role = role;
        if (typeof isActive === 'boolean') user.isActive = isActive;

        await user.save();

        res.json({
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isActive: user.isActive
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        res.status(500).json({ message });
    }
};

/**
 * @desc    Deactivate user
 * @route   PATCH /api/users/:id/deactivate
 * @access  Private (Admin)
 */
export const deactivateUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Prevent self-deactivation
        if (req.user!._id.toString() === id) {
            res.status(400).json({ message: 'Cannot deactivate your own account' });
            return;
        }

        user.isActive = false;
        await user.save();

        res.json({ message: 'User deactivated successfully' });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        res.status(500).json({ message });
    }
};

/**
 * @desc    Activate user
 * @route   PATCH /api/users/:id/activate
 * @access  Private (Admin)
 */
export const activateUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        user.isActive = true;
        await user.save();

        res.json({ message: 'User activated successfully' });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        res.status(500).json({ message });
    }
};

/**
 * @desc    Change password
 * @route   PATCH /api/users/:id/password
 * @access  Private
 */
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;

        // Only allow users to change their own password or admin
        if (req.user!._id.toString() !== id && req.user!.role !== 'ADMIN') {
            res.status(403).json({ message: 'Not authorized' });
            return;
        }

        // Verify current password
        const user = await User.findById(id).select('+passwordHash');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            res.status(400).json({ message: 'Current password is incorrect' });
            return;
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        res.status(500).json({ message });
    }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/users/:id
 * @access  Private (Admin)
 */
export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        if (req.user!._id.toString() === id) {
            res.status(400).json({ message: 'Cannot delete your own account' });
            return;
        }

        const user = await User.findById(id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        await user.deleteOne();
        res.json({ message: 'User deleted successfully' });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        res.status(500).json({ message });
    }
};

/**
 * @desc    Get users by role
 * @route   GET /api/users/role/:role
 * @access  Private
 */
export const getUsersByRole = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { role } = req.params;
        const users = await User.find(applyNonSyntheticUserFilter({ role, isActive: true }))
            .select('firstName lastName email')
            .sort({ lastName: 1 });

        res.json(users);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        res.status(500).json({ message });
    }
};
