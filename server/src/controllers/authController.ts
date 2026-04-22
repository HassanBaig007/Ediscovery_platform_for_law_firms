import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import User, { IUserDocument } from '../models/User';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.util';
import { AuthRequest } from '../middleware/authMiddleware';
import { sendPasswordResetEmail } from '../utils/email.util';

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { firstName, lastName, email, password, role, isActive } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            res.status(400).json({ success: false, message: 'User already exists' });
            return;
        }

        const user = await User.create({
            firstName,
            lastName,
            email,
            passwordHash: password,
            role: role || 'ASSOCIATE', // Default role
            ...(isActive !== undefined && { isActive })
        });

        if (user) {
            const { accessToken, refreshToken } = generateTokens(user);
            const userJson = user.toJSON();
            delete (userJson as any).passwordHash;

            res.status(201).json({
                success: true,
                data: {
                    user: userJson,
                    accessToken,
                    refreshToken
                }
            });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email }).select('+passwordHash');

        if (user) {
            const isMatch = await user.matchPassword(password);

            if (isMatch) {
                const { accessToken, refreshToken } = generateTokens(user);
                const userJson = user.toJSON();
                delete (userJson as any).passwordHash;

                res.json({
                    success: true,
                    data: {
                        user: userJson,
                        accessToken,
                        refreshToken
                    }
                });
            } else {
                res.status(401).json({ success: false, message: 'Invalid email or password' });
            }
        } else {
            res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req: AuthRequest, res: Response) => {
    res.json({
        success: true,
        data: req.user
    });
};

// @desc    Forgot password - send reset email
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body;
        
        const user = await User.findOne({ email }).select('+resetPasswordToken +resetPasswordExpire');
        
        // Always return success to prevent email enumeration
        if (!user) {
            res.json({ 
                success: true, 
                message: 'If an account exists, a password reset email has been sent' 
            });
            return;
        }

        // Generate a cryptographically secure reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpire = new Date(Date.now() + 3600000); // 1 hour
        
        await user.save({ validateBeforeSave: false });

        try {
            await sendPasswordResetEmail({ to: user.email, token: resetToken });
        } catch (emailError) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save({ validateBeforeSave: false });
            throw emailError;
        }

        res.json({ 
            success: true, 
            message: 'If an account with that email exists, a password reset link has been sent'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token, password } = req.body;

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpire: { $gt: Date.now() }
        }).select('+resetPasswordToken +resetPasswordExpire +passwordHash');

        if (!user) {
            res.status(400).json({ 
                success: false, 
                message: 'Invalid or expired reset token' 
            });
            return;
        }

        // Set new password
        user.passwordHash = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        
        await user.save();

        res.json({ 
            success: true, 
            message: 'Password has been reset successfully' 
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update current user profile (firstName, lastName)
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { firstName, lastName } = req.body;
        const user = req.user as IUserDocument;

        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;

        await user.save();

        const userJson = user.toJSON();
        delete (userJson as any).passwordHash;

        res.json({ success: true, data: { user: userJson } });
    } catch (error) {
        next(error);
    }
};

// @desc    Change current user password
// @route   PUT /api/auth/password
// @access  Private
export const changeOwnPassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user!._id;

        const user = await User.findById(userId).select('+passwordHash');
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            res.status(400).json({ success: false, message: 'Current password is incorrect' });
            return;
        }

        user.passwordHash = newPassword;
        await user.save();

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            res.status(400).json({ 
                success: false, 
                message: 'Refresh token is required' 
            });
            return;
        }

        // Verify refresh token and generate new access token
        const decoded = verifyRefreshToken(refreshToken);
        
        const user = await User.findById(decoded.id);
        
        if (!user || !user.isActive) {
            res.status(401).json({ 
                success: false, 
                message: 'Invalid refresh token' 
            });
            return;
        }

        const { accessToken: newAccessToken } = generateTokens(user);
        
        res.json({ 
            success: true, 
            data: { accessToken: newAccessToken } 
        });
    } catch (error) {
        res.status(401).json({ 
            success: false, 
            message: 'Invalid refresh token' 
        });
    }
};
