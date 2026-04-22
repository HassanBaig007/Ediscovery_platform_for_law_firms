// Operational Logger
// Structured logging for all core operations

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
    id: string;
    level: LogLevel;
    message: string;
    timestamp: Date;
    component: string;
    operation?: string;
    userId?: string;
    duration?: number;
    metadata?: Record<string, any>;
    error?: {
        message: string;
        stack?: string;
        code?: string;
    };
}

export class OperationalLogger {
    private logs: LogEntry[] = [];
    private logLevel: LogLevel = 'info';
    private maxLogSize = 10000;
    private metrics: Map<string, Array<{ timestamp: Date; value: number }>> = new Map();
    private metricRetentionMs = 24 * 60 * 60 * 1000; // 24 hours

    /**
     * Set log level
     */
    setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    /**
     * Log debug message
     */
    debug(component: string, message: string, metadata?: Record<string, any>): void {
        this.log('debug', component, message, metadata);
    }

    /**
     * Log info message
     */
    info(component: string, message: string, metadata?: Record<string, any>): void {
        this.log('info', component, message, metadata);
    }

    /**
     * Log warning message
     */
    warn(component: string, message: string, metadata?: Record<string, any>): void {
        this.log('warn', component, message, metadata);
    }

    /**
     * Log error message
     */
    error(component: string, message: string, error?: Error, metadata?: Record<string, any>): void {
        const entry = this.createLogEntry('error', component, message, metadata);
        
        if (error) {
            entry.error = {
                message: error.message,
                stack: error.stack,
                code: (error as any).code
            };
        }

        this.addLog(entry);
    }

    /**
     * Log fatal error
     */
    fatal(component: string, message: string, error?: Error, metadata?: Record<string, any>): void {
        const entry = this.createLogEntry('fatal', component, message, metadata);
        
        if (error) {
            entry.error = {
                message: error.message,
                stack: error.stack,
                code: (error as any).code
            };
        }

        this.addLog(entry);
    }

    /**
     * Log operation with duration
     */
    logOperation(
        component: string,
        operation: string,
        duration: number,
        success: boolean,
        metadata?: Record<string, any>
    ): void {
        const level: LogLevel = success ? 'info' : 'error';
        const message = `Operation ${operation} ${success ? 'completed' : 'failed'} in ${duration}ms`;

        const entry = this.createLogEntry(level, component, message, metadata);
        entry.operation = operation;
        entry.duration = duration;

        this.addLog(entry);
    }

    /**
     * Create log entry
     */
    private createLogEntry(
        level: LogLevel,
        component: string,
        message: string,
        metadata?: Record<string, any>
    ): LogEntry {
        return {
            id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            level,
            message,
            timestamp: new Date(),
            component,
            metadata
        };
    }

    /**
     * Add log entry
     */
    private addLog(entry: LogEntry): void {
        // Check if should log based on level
        if (!this.shouldLog(entry.level)) {
            return;
        }

        this.logs.push(entry);

        // Output to console
        this.outputToConsole(entry);

        // Maintain max log size
        if (this.logs.length > this.maxLogSize) {
            this.logs.shift();
        }
    }

    /**
     * Generic log method
     */
    private log(level: LogLevel, component: string, message: string, metadata?: Record<string, any>): void {
        const entry = this.createLogEntry(level, component, message, metadata);
        this.addLog(entry);
    }

    /**
     * Check if should log based on level
     */
    private shouldLog(level: LogLevel): boolean {
        const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
        const currentLevelIndex = levels.indexOf(this.logLevel);
        const messageLevelIndex = levels.indexOf(level);

        return messageLevelIndex >= currentLevelIndex;
    }

    /**
     * Output log to console
     */
    private outputToConsole(entry: LogEntry): void {
        const timestamp = entry.timestamp.toISOString();
        const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.component}]`;

        switch (entry.level) {
            case 'debug':
            case 'info':
                console.log(`${prefix} ${entry.message}`);
                break;
            case 'warn':
                console.warn(`${prefix} ${entry.message}`);
                break;
            case 'error':
            case 'fatal':
                console.error(`${prefix} ${entry.message}`, entry.error);
                break;
        }
    }

    /**
     * Get logs with filters
     */
    getLogs(filters?: {
        level?: LogLevel;
        component?: string;
        startTime?: Date;
        endTime?: Date;
        limit?: number;
    }): LogEntry[] {
        let filtered = [...this.logs];

        if (filters?.level) {
            filtered = filtered.filter(log => log.level === filters.level);
        }

        if (filters?.component) {
            filtered = filtered.filter(log => log.component === filters.component);
        }

        if (filters?.startTime) {
            filtered = filtered.filter(log => log.timestamp >= filters.startTime!);
        }

        if (filters?.endTime) {
            filtered = filtered.filter(log => log.timestamp <= filters.endTime!);
        }

        // Sort by timestamp descending
        filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        // Apply limit
        if (filters?.limit) {
            filtered = filtered.slice(0, filters.limit);
        }

        return filtered;
    }

    /**
     * Get log statistics
     */
    getLogStats(): {
        total: number;
        byLevel: Record<LogLevel, number>;
        byComponent: Record<string, number>;
        errorRate: number;
    } {
        const byLevel: Record<LogLevel, number> = {
            debug: 0,
            info: 0,
            warn: 0,
            error: 0,
            fatal: 0
        };

        const byComponent: Record<string, number> = {};

        for (const log of this.logs) {
            byLevel[log.level]++;
            byComponent[log.component] = (byComponent[log.component] || 0) + 1;
        }

        const errorCount = byLevel.error + byLevel.fatal;
        const errorRate = this.logs.length > 0 ? errorCount / this.logs.length : 0;

        return {
            total: this.logs.length,
            byLevel,
            byComponent,
            errorRate
        };
    }

    /**
     * Clean up old metrics
     */
    private cleanupOldMetrics(metricName: string): void {
        const metrics = this.metrics.get(metricName);
        
        if (!metrics) return;

        const cutoffTime = Date.now() - this.metricRetentionMs;
        const filtered = metrics.filter((m: { timestamp: Date; value: number }) => m.timestamp.getTime() >= cutoffTime);

        this.metrics.set(metricName, filtered);
    }

    /**
     * Export logs
     */
    exportLogs(format: 'json' | 'text' = 'json'): string {
        if (format === 'json') {
            return JSON.stringify(this.logs, null, 2);
        }

        // Text format
        return this.logs.map(log => {
            const timestamp = log.timestamp.toISOString();
            const level = log.level.toUpperCase().padEnd(5);
            const component = log.component.padEnd(20);
            return `${timestamp} ${level} ${component} ${log.message}`;
        }).join('\n');
    }

    /**
     * Clear logs
     */
    clearLogs(): void {
        this.logs = [];
    }
}
