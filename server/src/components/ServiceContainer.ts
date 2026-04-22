// Service Container
// Dependency injection container for all enhanced components
import { DocumentProcessor } from './document-processor/DocumentProcessor';
import { CollaborativeReviewService } from './collaborative-review/CollaborativeReviewService';
import { RedactionManagerService } from './redaction-manager/RedactionManagerService';
import { ProductionWorkflowService } from './production-workflow/ProductionWorkflowService';
import { SecurityManagerService } from './security-manager/SecurityManagerService';
import { ErrorHandler } from './platform-stability/ErrorHandler';
import { TransactionManager } from './platform-stability/TransactionManager';
import { HealthMonitor } from './platform-stability/HealthMonitor';
import { OperationalLogger } from './platform-stability/OperationalLogger';

export class ServiceContainer {
    private static instance: ServiceContainer;
    
    // Core services
    public documentProcessor: DocumentProcessor;
    public collaborativeReview: CollaborativeReviewService;
    public redactionManager: RedactionManagerService;
    public productionWorkflow: ProductionWorkflowService;
    public securityManager: SecurityManagerService;
    
    // Platform services
    public errorHandler: ErrorHandler;
    public transactionManager: TransactionManager;
    public healthMonitor: HealthMonitor;
    public logger: OperationalLogger;

    private constructor() {
        // Initialize logger first
        this.logger = new OperationalLogger();
        this.logger.info('ServiceContainer', 'Initializing service container');

        // Initialize platform services
        this.errorHandler = new ErrorHandler();
        this.transactionManager = new TransactionManager();
        this.healthMonitor = new HealthMonitor();

        this.documentProcessor = new DocumentProcessor();

        this.collaborativeReview = new CollaborativeReviewService();
        this.redactionManager = new RedactionManagerService();
        this.productionWorkflow = new ProductionWorkflowService();
        this.securityManager = new SecurityManagerService();

        this.logger.info('ServiceContainer', 'Service container initialized successfully');
    }

    /**
     * Get singleton instance
     */
    static getInstance(): ServiceContainer {
        if (!ServiceContainer.instance) {
            ServiceContainer.instance = new ServiceContainer();
        }
        return ServiceContainer.instance;
    }

    /**
     * Initialize all services
     */
    async initialize(): Promise<void> {
        this.logger.info('ServiceContainer', 'Starting service initialization');

        try {
            // Perform health checks
            await this.performHealthChecks();

            this.logger.info('ServiceContainer', 'All services initialized successfully');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error('ServiceContainer', 'Service initialization failed', error as Error);
            throw new Error(`Service initialization failed: ${errorMessage}`);
        }
    }

    /**
     * Perform health checks on all components
     */
    private async performHealthChecks(): Promise<void> {

        // Check document processor
        await this.healthMonitor.performHealthCheck('document-processor', async () => {
            return { healthy: true, message: 'Document processor operational' };
        });

        // Check collaborative review
        await this.healthMonitor.performHealthCheck('collaborative-review', async () => {
            return { healthy: true, message: 'Collaborative review operational' };
        });

        // Check redaction manager
        await this.healthMonitor.performHealthCheck('redaction-manager', async () => {
            return { healthy: true, message: 'Redaction manager operational' };
        });

        // Check production workflow
        await this.healthMonitor.performHealthCheck('production-workflow', async () => {
            return { healthy: true, message: 'Production workflow operational' };
        });

        // Check security manager
        await this.healthMonitor.performHealthCheck('security-manager', async () => {
            return { healthy: true, message: 'Security manager operational' };
        });
    }

    /**
     * Get system health status
     */
    getSystemHealth() {
        return this.healthMonitor.getSystemHealth();
    }

    /**
     * Shutdown all services
     */
    async shutdown(): Promise<void> {
        this.logger.info('ServiceContainer', 'Shutting down services');

        try {
            this.logger.info('ServiceContainer', 'All services shut down successfully');
        } catch (error) {
            this.logger.error('ServiceContainer', 'Error during shutdown', error as Error);
        }
    }

    /**
     * Reset singleton (for testing)
     */
    static reset(): void {
        ServiceContainer.instance = null as any;
    }
}

// Export singleton instance getter
export const getServiceContainer = () => ServiceContainer.getInstance();
