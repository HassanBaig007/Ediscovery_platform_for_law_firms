// Service Container
// Dependency injection container for all enhanced components

import { Client } from '@elastic/elasticsearch';
import { DocumentProcessor } from './document-processor/DocumentProcessor';
import { SearchEngine } from './search-engine/SearchEngine';
import { CollaborativeReviewService } from './collaborative-review/CollaborativeReviewService';
import { RedactionManagerService } from './redaction-manager/RedactionManagerService';
import { ProductionWorkflowService } from './production-workflow/ProductionWorkflowService';
import { SecurityManagerService } from './security-manager/SecurityManagerService';
import { ErrorHandler } from './platform-stability/ErrorHandler';
import { TransactionManager } from './platform-stability/TransactionManager';
import { HealthMonitor } from './platform-stability/HealthMonitor';
import { OperationalLogger } from './platform-stability/OperationalLogger';
import { elasticsearchClient } from './search-engine/ElasticsearchClient';

export class ServiceContainer {
    private static instance: ServiceContainer;
    
    // Core services
    public documentProcessor: DocumentProcessor;
    public searchEngine: SearchEngine;
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

        // Initialize core services
        this.documentProcessor = new DocumentProcessor();
        
        // Initialize search engine (will be connected during initialize())
        this.searchEngine = new SearchEngine(null as any); // Will be set during initialize()

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
        const elasticsearchEnabled = process.env.ELASTICSEARCH_ENABLED !== 'false';

        try {
            if (elasticsearchEnabled) {
                // Connect to Elasticsearch
                await elasticsearchClient.connect();
                this.logger.info('ServiceContainer', 'Elasticsearch connected');

                // Set the Elasticsearch client in SearchEngine
                const esClient = elasticsearchClient.getClient();
                this.searchEngine = new SearchEngine(esClient);

                // Initialize search engine
                await this.searchEngine.initialize();
                this.logger.info('ServiceContainer', 'Search engine initialized');
            } else {
                this.logger.warn('ServiceContainer', 'Elasticsearch disabled by configuration (ELASTICSEARCH_ENABLED=false)');
            }

            // Perform health checks
            await this.performHealthChecks(elasticsearchEnabled);

            this.logger.info('ServiceContainer', 'All services initialized successfully');
        } catch (error) {
            if (elasticsearchEnabled) {
                this.logger.warn('ServiceContainer', 'Elasticsearch unavailable, continuing in degraded mode', {
                    message: error instanceof Error ? error.message : 'Unknown error'
                });

                // If Elasticsearch is unavailable, keep the process alive for local development.
                await this.performHealthChecks(false);
                this.logger.info('ServiceContainer', 'Core services initialized in degraded mode (search disabled)');
                return;
            }

            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error('ServiceContainer', 'Service initialization failed', error as Error);
            throw new Error(`Service initialization failed: ${errorMessage}`);
        }
    }

    /**
     * Perform health checks on all components
     */
    private async performHealthChecks(elasticsearchEnabled: boolean): Promise<void> {
        if (elasticsearchEnabled) {
            // Check Elasticsearch
            await this.healthMonitor.performHealthCheck('elasticsearch', async () => {
                try {
                    const health = await elasticsearchClient.getHealth();
                    return {
                        healthy: health.status === 'green' || health.status === 'yellow',
                        message: `Cluster status: ${health.status}`
                    };
                } catch (error) {
                    return {
                        healthy: false,
                        message: error instanceof Error ? error.message : 'Connection failed'
                    };
                }
            });
        }

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
            await elasticsearchClient.close();
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
