import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware';
import {
    getAllUsers,
    getUserById,
    updateUser,
    deactivateUser,
    activateUser,
    changePassword,
    getUsersByRole,
    deleteUser
} from '../controllers/user.controller';

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/users - Get all users (Admin only)
router.get('/', authorize('ADMIN'), getAllUsers);

// GET /api/users/role/:role - Get users by role
router.get('/role/:role', getUsersByRole);

// GET /api/users/:id - Get user by ID
router.get('/:id', getUserById);

// PUT /api/users/:id - Update user
router.put('/:id', authorize('ADMIN'), updateUser);

// PATCH /api/users/:id/deactivate - Deactivate user
router.patch('/:id/deactivate', authorize('ADMIN'), deactivateUser);

// PATCH /api/users/:id/activate - Activate user
router.patch('/:id/activate', authorize('ADMIN'), activateUser);

// PATCH /api/users/:id/password - Change password
router.patch('/:id/password', changePassword);

// DELETE /api/users/:id - Delete user (Admin only)
router.delete('/:id', authorize('ADMIN'), deleteUser);

export default router;
