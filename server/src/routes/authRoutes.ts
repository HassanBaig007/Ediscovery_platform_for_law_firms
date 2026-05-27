import express from 'express';
import { registerUser, loginUser, getMe, forgotPassword, resetPassword, refreshToken, updateProfile, changeOwnPassword } from '../controllers/authController';
import { protect, adminOnly } from '../middleware/authMiddleware';
import { rateLimit } from '../middleware/rateLimit.middleware';

const router = express.Router();

// Test route to verify router is working
router.get('/test', (req, res) => {
    res.json({ message: 'Auth routes are working!' });
});

// Only authenticated Admins may create new user accounts
router.post('/register', protect, adminOnly, registerUser);
router.post('/login', rateLimit(10, 15 * 60 * 1000), loginUser);
router.get('/me', protect, getMe);
router.post('/refresh', refreshToken);
router.post('/forgot-password', rateLimit(5, 15 * 60 * 1000), forgotPassword);
router.post('/reset-password', rateLimit(5, 15 * 60 * 1000), resetPassword);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changeOwnPassword);

export default router;
