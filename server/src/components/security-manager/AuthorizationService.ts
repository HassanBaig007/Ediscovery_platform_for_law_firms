// Authorization Service
// Implements role-based access control (RBAC)

import { UserRole } from '../../../../shared/types';
import { Permission } from '../../../../shared/enhanced-types';

export interface AccessPolicy {
    resource: string;
    role: UserRole;
    actions: string[];
}

export class AuthorizationService {
    private policies: AccessPolicy[] = [];

    constructor() {
        this.initializeDefaultPolicies();
    }

    /**
     * Initialize default RBAC policies
     */
    private initializeDefaultPolicies(): void {
        // Admin has full access
        this.policies.push({
            resource: '*',
            role: 'ADMIN',
            actions: ['*']
        });

        // Partner permissions
        this.policies.push(
            { resource: 'case', role: 'PARTNER', actions: ['create', 'read', 'update', 'delete'] },
            { resource: 'document', role: 'PARTNER', actions: ['create', 'read', 'update', 'delete'] },
            { resource: 'production', role: 'PARTNER', actions: ['create', 'read', 'approve', 'export'] },
            { resource: 'user', role: 'PARTNER', actions: ['read', 'update'] },
            { resource: 'tag', role: 'PARTNER', actions: ['create', 'read', 'update', 'delete'] },
            { resource: 'redaction', role: 'PARTNER', actions: ['create', 'read', 'approve'] }
        );

        // Associate permissions
        this.policies.push(
            { resource: 'case', role: 'ASSOCIATE', actions: ['read'] },
            { resource: 'document', role: 'ASSOCIATE', actions: ['read', 'update'] },
            { resource: 'production', role: 'ASSOCIATE', actions: ['read'] },
            { resource: 'tag', role: 'ASSOCIATE', actions: ['create', 'read', 'update'] },
            { resource: 'redaction', role: 'ASSOCIATE', actions: ['create', 'read'] }
        );

        // Paralegal permissions
        this.policies.push(
            { resource: 'case', role: 'PARALEGAL', actions: ['read'] },
            { resource: 'document', role: 'PARALEGAL', actions: ['read', 'update'] },
            { resource: 'production', role: 'PARALEGAL', actions: ['read'] },
            { resource: 'tag', role: 'PARALEGAL', actions: ['read', 'update'] }
        );
    }

    /**
     * Check if user is authorized to perform action on resource
     */
    async authorize(userId: string, userRole: UserRole, resource: string, action: string): Promise<boolean> {
        // Find applicable policies
        const applicablePolicies = this.policies.filter(policy => 
            policy.role === userRole &&
            (policy.resource === '*' || policy.resource === resource)
        );

        // Check if any policy allows the action
        for (const policy of applicablePolicies) {
            if (policy.actions.includes('*') || policy.actions.includes(action)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get user permissions for a resource
     */
    getUserPermissions(userRole: UserRole, resource: string): string[] {
        const applicablePolicies = this.policies.filter(policy => 
            policy.role === userRole &&
            (policy.resource === '*' || policy.resource === resource)
        );

        const actions = new Set<string>();

        for (const policy of applicablePolicies) {
            if (policy.actions.includes('*')) {
                return ['create', 'read', 'update', 'delete', 'approve', 'export'];
            }
            policy.actions.forEach(action => actions.add(action));
        }

        return Array.from(actions);
    }

    /**
     * Add custom policy
     */
    addPolicy(policy: AccessPolicy): void {
        this.policies.push(policy);
    }

    /**
     * Remove policy
     */
    removePolicy(resource: string, role: UserRole, action: string): void {
        this.policies = this.policies.filter(policy => 
            !(policy.resource === resource && policy.role === role && policy.actions.includes(action))
        );
    }

    /**
     * Check if user has any permission on resource
     */
    hasAnyPermission(userRole: UserRole, resource: string): boolean {
        return this.policies.some(policy => 
            policy.role === userRole &&
            (policy.resource === '*' || policy.resource === resource) &&
            policy.actions.length > 0
        );
    }

    /**
     * Validate least-privilege principle
     */
    validateLeastPrivilege(userRole: UserRole, requestedActions: string[]): {
        isValid: boolean;
        violations: string[];
    } {
        const violations: string[] = [];

        // Check if user is requesting more permissions than their role allows
        const allowedActions = new Set<string>();
        
        this.policies
            .filter(p => p.role === userRole)
            .forEach(p => p.actions.forEach(a => allowedActions.add(a)));

        for (const action of requestedActions) {
            if (!allowedActions.has(action) && !allowedActions.has('*')) {
                violations.push(`Role ${userRole} does not have permission for action: ${action}`);
            }
        }

        return {
            isValid: violations.length === 0,
            violations
        };
    }

    /**
     * Get all policies for a role
     */
    getRolePolicies(role: UserRole): AccessPolicy[] {
        return this.policies.filter(policy => policy.role === role);
    }

    /**
     * Check if action requires elevated privileges
     */
    requiresElevatedPrivileges(resource: string, action: string): boolean {
        const elevatedActions = ['delete', 'approve', 'export', 'admin'];
        return elevatedActions.includes(action);
    }
}
