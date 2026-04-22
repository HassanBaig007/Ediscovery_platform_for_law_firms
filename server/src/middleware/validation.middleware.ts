// Validation Middleware
// Request/response validation for API endpoints

import { Request, Response, NextFunction } from 'express';

export interface ValidationRule {
    field: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date';
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: any) => boolean;
}

export class ValidationMiddleware {
    /**
     * Validate request body
     */
    static validateBody(rules: ValidationRule[]) {
        return (req: Request, res: Response, next: NextFunction) => {
            const errors: string[] = [];

            for (const rule of rules) {
                const value = req.body[rule.field];

                // Check required
                if (rule.required && (value === undefined || value === null)) {
                    errors.push(`Field '${rule.field}' is required`);
                    continue;
                }

                // Skip validation if not required and not present
                if (!rule.required && (value === undefined || value === null)) {
                    continue;
                }

                // Type validation
                if (!ValidationMiddleware.validateType(value, rule.type)) {
                    errors.push(`Field '${rule.field}' must be of type ${rule.type}`);
                    continue;
                }

                // String validations
                if (rule.type === 'string') {
                    if (rule.minLength && value.length < rule.minLength) {
                        errors.push(`Field '${rule.field}' must be at least ${rule.minLength} characters`);
                    }
                    if (rule.maxLength && value.length > rule.maxLength) {
                        errors.push(`Field '${rule.field}' must be at most ${rule.maxLength} characters`);
                    }
                    if (rule.pattern && !rule.pattern.test(value)) {
                        errors.push(`Field '${rule.field}' does not match required pattern`);
                    }
                }

                // Number validations
                if (rule.type === 'number') {
                    if (rule.min !== undefined && value < rule.min) {
                        errors.push(`Field '${rule.field}' must be at least ${rule.min}`);
                    }
                    if (rule.max !== undefined && value > rule.max) {
                        errors.push(`Field '${rule.field}' must be at most ${rule.max}`);
                    }
                }

                // Custom validation
                if (rule.custom && !rule.custom(value)) {
                    errors.push(`Field '${rule.field}' failed custom validation`);
                }
            }

            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }

            next();
        };
    }

    /**
     * Validate type
     */
    private static validateType(value: any, type: ValidationRule['type']): boolean {
        switch (type) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number' && !isNaN(value);
            case 'boolean':
                return typeof value === 'boolean';
            case 'array':
                return Array.isArray(value);
            case 'object':
                return typeof value === 'object' && value !== null && !Array.isArray(value);
            case 'date':
                return value instanceof Date || !isNaN(Date.parse(value));
            default:
                return false;
        }
    }

    /**
     * Validate query parameters
     */
    static validateQuery(rules: ValidationRule[]) {
        return (req: Request, res: Response, next: NextFunction) => {
            const errors: string[] = [];

            for (const rule of rules) {
                const value = req.query[rule.field];

                if (rule.required && !value) {
                    errors.push(`Query parameter '${rule.field}' is required`);
                    continue;
                }

                if (!rule.required && !value) {
                    continue;
                }

                // Type validation (query params are always strings initially)
                if (rule.type === 'number') {
                    const numValue = Number(value);
                    if (isNaN(numValue)) {
                        errors.push(`Query parameter '${rule.field}' must be a number`);
                    }
                }
            }

            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }

            next();
        };
    }

    /**
     * Sanitize input
     */
    static sanitize() {
        return (req: Request, res: Response, next: NextFunction) => {
            // Sanitize body
            if (req.body) {
                req.body = ValidationMiddleware.sanitizeObject(req.body);
            }

            // Sanitize query
            if (req.query) {
                req.query = ValidationMiddleware.sanitizeObject(req.query);
            }

            next();
        };
    }

    /**
     * Sanitize object recursively
     */
    private static sanitizeObject(obj: any): any {
        if (typeof obj === 'string') {
            return obj.trim();
        }

        if (Array.isArray(obj)) {
            return obj.map(item => ValidationMiddleware.sanitizeObject(item));
        }

        if (typeof obj === 'object' && obj !== null) {
            const sanitized: any = {};
            for (const key in obj) {
                sanitized[key] = ValidationMiddleware.sanitizeObject(obj[key]);
            }
            return sanitized;
        }

        return obj;
    }
}
