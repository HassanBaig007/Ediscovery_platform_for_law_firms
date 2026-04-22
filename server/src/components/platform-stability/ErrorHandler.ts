// Error Handler
// Implements graceful error handling and recovery

import {
    ProcessingError,
    SearchError,
    ReviewError,
    ProductionError,
    SecurityError
} from '../../../../shared/enhanced-types';

export type ErrorType = ProcessingError | SearchError | ReviewError | ProductionError | SecurityError;

export interface RetryConfig {
    maxAttempts: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
}

export interface ErrorRecoveryStrategy {
    errorCode: string;
    strategy: 'retry' | 'fallback' | 'manual' | 'ignore';
    maxRetries?: number;
    fallbackAction?: () => Promise<any>;
}

export class ErrorHandler {
    private errorLog: ErrorType[] = [];
    private retryConfig: Required<RetryConfig>;
    private recoveryStrategies: Map<string, ErrorRecoveryStrategy> = new Map();

    constructor(retryConfig: Partial<RetryConfig> = {}) {
        this.retryConfig = {
            maxAttempts: retryConfig.maxAttempts || 3,
            initialDelayMs: retryConfig.initialDelayMs || 1000,
            maxDelayMs: retryConfig.maxDelayMs || 30000,
            backoffMultiplier: retryConfig.backoffMultiplier || 2
        };

        this.initializeDefaultStrategies();
    }

    /**
     * Initialize default recovery strategies
     */
    private initializeDefaultStrategies(): void {
        this.recoveryStrategies.set('NETWORK_ERROR', {
            errorCode: 'NETWORK_ERROR',
            strategy: 'retry',
            maxRetries: 3
        });

        this.recoveryStrategies.set('TIMEOUT_ERROR', {
            errorCode: 'TIMEOUT_ERROR',
            strategy: 'retry',
            maxRetries: 2
        });

        this.recoveryStrategies.set('VALIDATION_ERROR', {
            errorCode: 'VALIDATION_ERROR',
            strategy: 'manual'
        });

        this.recoveryStrategies.set('PERMISSION_DENIED', {
            errorCode: 'PERMISSION_DENIED',
            strategy: 'manual'
        });
    }

    /**
     * Handle error with automatic recovery
     */
    async handleError<T>(
        operation: () => Promise<T>,
        errorContext: { code: string; retryable: boolean }
    ): Promise<T> {
        let lastError: Error | undefined;
        const strategy = this.recoveryStrategies.get(errorContext.code);
        const maxAttempts = strategy?.maxRetries || this.retryConfig.maxAttempts;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown error');
                
                // Log error
                this.logError({
                    code: errorContext.code,
                    message: lastError.message,
                    timestamp: new Date(),
                    retryable: errorContext.retryable
                } as ProcessingError);

                // Check if should retry
                if (!errorContext.retryable || attempt >= maxAttempts) {
                    break;
                }

                // Calculate delay with exponential backoff
                const delay = Math.min(
                    this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
                    this.retryConfig.maxDelayMs
                );

                await this.sleep(delay);
            }
        }

        throw lastError || new Error('Operation failed');
    }

    /**
     * Log error
     */
    private logError(error: ErrorType): void {
        this.errorLog.push(error);
        console.error(`[${error.code}] ${error.message}`, error);
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get error statistics
     */
    getErrorStats(): {
        totalErrors: number;
        errorsByCode: Record<string, number>;
        recentErrors: ErrorType[];
        retryableErrors: number;
    } {
        const errorsByCode: Record<string, number> = {};
        let retryableErrors = 0;

        for (const error of this.errorLog) {
            errorsByCode[error.code] = (errorsByCode[error.code] || 0) + 1;
            
            if ('retryable' in error && error.retryable) {
                retryableErrors++;
            }
        }

        const recentErrors = this.errorLog
            .slice(-20)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        return {
            totalErrors: this.errorLog.length,
            errorsByCode,
            recentErrors,
            retryableErrors
        };
    }

    /**
     * Clear error log
     */
    clearErrorLog(): void {
        this.errorLog = [];
    }

    /**
     * Add recovery strategy
     */
    addRecoveryStrategy(strategy: ErrorRecoveryStrategy): void {
        this.recoveryStrategies.set(strategy.errorCode, strategy);
    }

    /**
     * Get recovery strategy
     */
    getRecoveryStrategy(errorCode: string): ErrorRecoveryStrategy | undefined {
        return this.recoveryStrategies.get(errorCode);
    }
}
