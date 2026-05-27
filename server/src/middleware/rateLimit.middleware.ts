import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
        if (now > entry.resetTime) {
            store.delete(key);
        }
    }
}, 5 * 60 * 1000);

/**
 * Simple in-memory rate limiter middleware.
 * @param maxAttempts  Maximum requests allowed per window
 * @param windowMs    Window duration in milliseconds (default: 15 minutes)
 */
export const rateLimit = (maxAttempts: number = 10, windowMs: number = 15 * 60 * 1000) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const key = req.ip || req.socket.remoteAddress || 'unknown';
        const now = Date.now();

        let entry = store.get(key);

        if (!entry || now > entry.resetTime) {
            // First request or window expired — start fresh
            entry = { count: 1, resetTime: now + windowMs };
            store.set(key, entry);
            return next();
        }

        entry.count++;

        if (entry.count > maxAttempts) {
            const retryAfterSec = Math.ceil((entry.resetTime - now) / 1000);
            res.set('Retry-After', String(retryAfterSec));
            res.status(429).json({
                success: false,
                message: `Too many attempts. Please try again in ${Math.ceil(retryAfterSec / 60)} minute(s).`,
            });
            return;
        }

        next();
    };
};
