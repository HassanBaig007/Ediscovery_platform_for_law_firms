import express from 'express';
import { registerUser, loginUser, getMe, forgotPassword, resetPassword, refreshToken, updateProfile, changeOwnPassword } from '../controllers/authController';
import { protect, adminOnly } from '../middleware/authMiddleware';

const router = express.Router();

// Only authenticated Admins may create new user accounts
router.post('/register', protect, adminOnly, registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changeOwnPassword);

export default router;
