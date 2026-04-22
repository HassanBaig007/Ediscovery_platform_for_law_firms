// Health Monitor
// Real-time health metrics and alerting

export interface HealthMetric {
    name: string;
    value: number;
    unit: string;
    timestamp: Date;
    status: 'healthy' | 'warning' | 'critical';
}

export interface HealthCheck {
    component: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    message?: string;
    lastChecked: Date;
    responseTime?: number;
}

export interface Alert {
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    component: string;
    message: string;
    timestamp: Date;
    acknowledged: boolean;
    acknowledgedBy?: string;
    acknowledgedAt?: Date;
}

export class HealthMonitor {
    private metrics: Map<string, HealthMetric[]> = new Map();
    private healthChecks: Map<string, HealthCheck> = new Map();
    private alerts: Alert[] = [];
    private metricRetentionMs = 3600000; // 1 hour

    /**
     * Record a health metric
     */
    recordMetric(
        name: string,
        value: number,
        unit: string,
        thresholds?: { warning: number; critical: number }
    ): HealthMetric {
        let status: HealthMetric['status'] = 'healthy';

        if (thresholds) {
            if (value >= thresholds.critical) {
                status = 'critical';
            } else if (value >= thresholds.warning) {
                status = 'warning';
            }
        }

        const metric: HealthMetric = {
            name,
            value,
            unit,
            timestamp: new Date(),
            status
        };

        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }

        this.metrics.get(name)!.push(metric);

        // Trigger alert if critical
        if (status === 'critical') {
            this.createAlert('critical', name, `Metric ${name} reached critical value: ${value}${unit}`);
        }

        // Clean up old metrics
        this.cleanupOldMetrics(name);

        return metric;
    }

    /**
     * Perform health check on component
     */
    async performHealthCheck(
        component: string,
        checkFunction: () => Promise<{ healthy: boolean; message?: string }>
    ): Promise<HealthCheck> {
        const startTime = Date.now();

        try {
            const result = await checkFunction();
            const responseTime = Date.now() - startTime;

            const healthCheck: HealthCheck = {
                component,
                status: result.healthy ? 'healthy' : 'unhealthy',
                message: result.message,
                lastChecked: new Date(),
                responseTime
            };

            this.healthChecks.set(component, healthCheck);

            // Create alert if unhealthy
            if (!result.healthy) {
                this.createAlert('high', component, result.message || 'Component health check failed');
            }

            return healthCheck;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const healthCheck: HealthCheck = {
                component,
                status: 'unhealthy',
                message: `Health check failed: ${errorMessage}`,
                lastChecked: new Date(),
                responseTime: Date.now() - startTime
            };

            this.healthChecks.set(component, healthCheck);
            this.createAlert('critical', component, healthCheck.message!);

            return healthCheck;
        }
    }

    /**
     * Get all health checks
     */
    getAllHealthChecks(): HealthCheck[] {
        return Array.from(this.healthChecks.values());
    }

    /**
     * Get system health status
     */
    getSystemHealth(): {
        overall: 'healthy' | 'degraded' | 'unhealthy';
        components: HealthCheck[];
        unhealthyCount: number;
    } {
        const components = this.getAllHealthChecks();
        const unhealthyCount = components.filter(c => c.status === 'unhealthy').length;
        const degradedCount = components.filter(c => c.status === 'degraded').length;

        let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
        
        if (unhealthyCount > 0) {
            overall = 'unhealthy';
        } else if (degradedCount > 0) {
            overall = 'degraded';
        }

        return {
            overall,
            components,
            unhealthyCount
        };
    }

    /**
     * Create alert
     */
    private createAlert(severity: Alert['severity'], component: string, message: string): Alert {
        const alert: Alert = {
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            severity,
            component,
            message,
            timestamp: new Date(),
            acknowledged: false
        };

        this.alerts.push(alert);
        return alert;
    }

    /**
     * Get active alerts
     */
    getActiveAlerts(): Alert[] {
        return this.alerts
            .filter(alert => !alert.acknowledged)
            .sort((a, b) => {
                // Sort by severity first, then timestamp
                const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
                
                if (severityDiff !== 0) return severityDiff;
                return b.timestamp.getTime() - a.timestamp.getTime();
            });
    }

    /**
     * Acknowledge alert
     */
    acknowledgeAlert(alertId: string, acknowledgedBy: string): Alert {
        const alert = this.alerts.find(a => a.id === alertId);

        if (!alert) {
            throw new Error(`Alert ${alertId} not found`);
        }

        alert.acknowledged = true;
        alert.acknowledgedBy = acknowledgedBy;
        alert.acknowledgedAt = new Date();

        return alert;
    }

    /**
     * Get metric history
     */
    getMetricHistory(metricName: string, durationMs?: number): HealthMetric[] {
        const metrics = this.metrics.get(metricName) || [];

        if (!durationMs) {
            return metrics;
        }

        const cutoffTime = Date.now() - durationMs;
        return metrics.filter(m => m.timestamp.getTime() >= cutoffTime);
    }

    /**
     * Calculate metric average
     */
    getMetricAverage(metricName: string, durationMs: number): number {
        const metrics = this.getMetricHistory(metricName, durationMs);

        if (metrics.length === 0) {
            return 0;
        }

        const sum = metrics.reduce((acc, m) => acc + m.value, 0);
        return sum / metrics.length;
    }

    /**
     * Clean up old metrics
     */
    private cleanupOldMetrics(metricName: string): void {
        const metrics = this.metrics.get(metricName);
        
        if (!metrics) return;

        const cutoffTime = Date.now() - this.metricRetentionMs;
        const filtered = metrics.filter(m => m.timestamp.getTime() >= cutoffTime);

        this.metrics.set(metricName, filtered);
    }

    /**
     * Get alert statistics
     */
    getAlertStats(): {
        total: number;
        active: number;
        acknowledged: number;
        bySeverity: Record<string, number>;
    } {
        const bySeverity: Record<string, number> = {
            low: 0,
            medium: 0,
            high: 0,
            critical: 0
        };

        let active = 0;
        let acknowledged = 0;

        for (const alert of this.alerts) {
            bySeverity[alert.severity]++;
            
            if (alert.acknowledged) {
                acknowledged++;
            } else {
                active++;
            }
        }

        return {
            total: this.alerts.length,
            active,
            acknowledged,
            bySeverity
        };
    }
}
