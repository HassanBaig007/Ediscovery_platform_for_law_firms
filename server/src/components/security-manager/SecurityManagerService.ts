// Security Manager Service
// Main service that implements the SecurityManager interface

import {
    SecurityManager,
    Credentials,
    AuthResult,
    AuditEntry,
    AuditFilters
} from '../../../../shared/enhanced-types';
import { UserRole } from '../../../../shared/types';
import { AuthenticationService } from './AuthenticationService';
import { AuthorizationService } from './AuthorizationService';
import { AuditLoggingService } from './AuditLoggingService';
import { EncryptionService } from './EncryptionService';
import User from '../../models/User';

export class SecurityManagerService implements SecurityManager {
    private authenticationService: AuthenticationService;
    private authorizationService: AuthorizationService;
    private auditLoggingService: AuditLoggingService;
    private encryptionService: EncryptionService;

    constructor() {
        this.authenticationService = new AuthenticationService();
        this.authorizationService = new AuthorizationService();
        this.auditLoggingService = new AuditLoggingService();
        this.encryptionService = new EncryptionService();
    }

    /**
     * Authenticate user
     */
    async authenticate(credentials: Credentials): Promise<AuthResult> {
        const result = await this.authenticationService.authenticate(credentials);

        // Log authentication attempt
        if (result.success && result.user) {
            await this.auditLoggingService.logAccess(
                result.user.id,
                'authentication',
                'login'
            );
        }

        return result;
    }

    /**
     * Authorize user action
     */
    async authorize(userId: string, resource: string, action: string): Promise<boolean> {
        // Fetch user from database to get real role
        const userDoc = await User.findById(userId);
        
        if (!userDoc || !userDoc.isActive) {
            return false;
        }

        const userRole: UserRole = userDoc.role as UserRole;

        const isAuthorized = await this.authorizationService.authorize(
            userId,
            userRole,
            resource,
            action
        );

        // Log authorization attempt
        await this.auditLoggingService.logAccess(
            userId,
            resource,
            action,
            undefined,
            undefined,
            { authorized: isAuthorized }
        );

        return isAuthorized;
    }

    /**
     * Log access to resource
     */
    async logAccess(userId: string, resource: string, action: string): Promise<void> {
        await this.auditLoggingService.logAccess(userId, resource, action);
    }

    /**
     * Get audit trail
     */
    async getAuditTrail(filters: AuditFilters): Promise<AuditEntry[]> {
        return await this.auditLoggingService.getAuditTrail(filters);
    }

    /**
     * Enforce MFA setup for user
     */
    async enforceMFASetup(userId: string): Promise<void> {
        await this.authenticationService.enableMFA(userId, 'totp');
    }

    /**
     * Validate password strength
     */
    async validatePassword(password: string): Promise<{ valid: boolean; errors: string[] }> {
        const errors: string[] = [];

        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }

        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }

        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }

        if (!/[0-9]/.test(password)) {
            errors.push('Password must contain at least one number');
        }

        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Encrypt sensitive data
     */
    encryptData(data: string): any {
        return this.encryptionService.encrypt(data);
    }

    /**
     * Decrypt sensitive data
     */
    decryptData(encryptedData: any): string {
        return this.encryptionService.decrypt(encryptedData);
    }

    /**
     * Get user permissions
     */
    getUserPermissions(userRole: UserRole, resource: string): string[] {
        return this.authorizationService.getUserPermissions(userRole, resource);
    }

    /**
     * Logout user
     */
    async logout(token: string): Promise<void> {
        await this.authenticationService.logout(token);
    }
}
