// Authentication Service
// Handles user authentication with MFA support

import { Credentials, AuthResult, IUser, UserRole } from '../../../../shared/enhanced-types';
import User from '../../models/User';

export interface MFAConfig {
    enabled: boolean;
    method: 'totp' | 'sms' | 'email';
    secret?: string;
}

export interface Session {
    id: string;
    userId: string;
    token: string;
    refreshToken: string;
    createdAt: Date;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
}

export class AuthenticationService {
    private sessions: Map<string, Session> = new Map();
    private mfaConfigs: Map<string, MFAConfig> = new Map();
    private sessionTimeout = 3600000; // 1 hour

    /**
     * Authenticate user with credentials
     */
    async authenticate(credentials: Credentials): Promise<AuthResult> {
        try {
            // Validate credentials format
            if (!credentials.email || !credentials.password) {
                return {
                    success: false,
                    error: 'Email and password are required'
                };
            }

            // Query database for user
            const userDoc = await User.findOne({ email: credentials.email }).select('+passwordHash');

            if (!userDoc || !userDoc.isActive) {
                return {
                    success: false,
                    error: 'Invalid credentials'
                };
            }

            // Verify password using the model's matchPassword method
            const isValidPassword = await userDoc.matchPassword(credentials.password);

            if (!isValidPassword) {
                return {
                    success: false,
                    error: 'Invalid credentials'
                };
            }

            // Convert to IUser format
            const user: IUser = {
                id: userDoc._id.toString(),
                email: userDoc.email,
                firstName: userDoc.firstName,
                lastName: userDoc.lastName,
                role: userDoc.role as UserRole,
                isActive: userDoc.isActive,
                createdAt: userDoc.createdAt,
                updatedAt: userDoc.updatedAt
            };

            // Check if MFA is required
            const mfaConfig = this.mfaConfigs.get(user.id);
            if (mfaConfig?.enabled && !credentials.token) {
                return {
                    success: false,
                    requiresMFA: true,
                    error: 'MFA token required'
                };
            }

            // Verify MFA token if provided
            if (mfaConfig?.enabled && credentials.token) {
                const isValidToken = await this.verifyMFAToken(user.id, credentials.token);
                
                if (!isValidToken) {
                    return {
                        success: false,
                        error: 'Invalid MFA token'
                    };
                }
            }

            // Create session
            const session = await this.createSession(user.id);

            return {
                success: true,
                token: session.token,
                refreshToken: session.refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    isActive: user.isActive,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
                }
            };

            return {
                success: true,
                user,
                token: session.token,
                refreshToken: session.refreshToken
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Create user session
     */
    private async createSession(userId: string): Promise<Session> {
        const session: Session = {
            id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId,
            token: this.generateToken(),
            refreshToken: this.generateToken(),
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + this.sessionTimeout)
        };

        this.sessions.set(session.id, session);
        return session;
    }

    /**
     * Verify MFA token
     */
    private async verifyMFAToken(userId: string, token: string): Promise<boolean> {
        // In real implementation, would verify TOTP token or SMS code
        // For now, accept any 6-digit token
        return /^\d{6}$/.test(token);
    }

    /**
     * Generate authentication token
     */
    private generateToken(): string {
        return `token-${Date.now()}-${Math.random().toString(36).substr(2, 16)}`;
    }

    /**
     * Validate session token
     */
    async validateToken(token: string): Promise<{ valid: boolean; userId?: string }> {
        const session = Array.from(this.sessions.values())
            .find(s => s.token === token);

        if (!session) {
            return { valid: false };
        }

        if (session.expiresAt < new Date()) {
            this.sessions.delete(session.id);
            return { valid: false };
        }

        return { valid: true, userId: session.userId };
    }

    /**
     * Refresh session token
     */
    async refreshSession(refreshToken: string): Promise<AuthResult> {
        const session = Array.from(this.sessions.values())
            .find(s => s.refreshToken === refreshToken);

        if (!session) {
            return {
                success: false,
                error: 'Invalid refresh token'
            };
        }

        // Create new session
        const newSession = await this.createSession(session.userId);

        // Invalidate old session
        this.sessions.delete(session.id);

        return {
            success: true,
            token: newSession.token,
            refreshToken: newSession.refreshToken
        };
    }

    /**
     * Logout user
     */
    async logout(token: string): Promise<void> {
        const session = Array.from(this.sessions.values())
            .find(s => s.token === token);

        if (session) {
            this.sessions.delete(session.id);
        }
    }

    /**
     * Enable MFA for user
     */
    async enableMFA(userId: string, method: MFAConfig['method']): Promise<MFAConfig> {
        const config: MFAConfig = {
            enabled: true,
            method,
            secret: this.generateMFASecret()
        };

        this.mfaConfigs.set(userId, config);
        return config;
    }

    /**
     * Disable MFA for user
     */
    async disableMFA(userId: string): Promise<void> {
        this.mfaConfigs.delete(userId);
    }

    /**
     * Generate MFA secret
     */
    private generateMFASecret(): string {
        return Math.random().toString(36).substr(2, 16).toUpperCase();
    }

    /**
     * Get active sessions for user
     */
    getUserSessions(userId: string): Session[] {
        return Array.from(this.sessions.values())
            .filter(s => s.userId === userId && s.expiresAt > new Date());
    }

    /**
     * Revoke all user sessions
     */
    async revokeAllUserSessions(userId: string): Promise<number> {
        let count = 0;
        
        for (const [sessionId, session] of this.sessions.entries()) {
            if (session.userId === userId) {
                this.sessions.delete(sessionId);
                count++;
            }
        }

        return count;
    }
}
