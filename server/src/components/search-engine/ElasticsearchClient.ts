// Elasticsearch Client Configuration
// Manages connection pooling and client configuration for Elasticsearch

import { Client } from '@elastic/elasticsearch';

export interface ElasticsearchConfig {
    node: string;
    auth?: {
        username: string;
        password: string;
    };
    maxRetries?: number;
    requestTimeout?: number;
    sniffOnStart?: boolean;
}

export class ElasticsearchClient {
    private client: Client;
    private config: ElasticsearchConfig;
    private isConnected = false;

    constructor(config: ElasticsearchConfig) {
        this.config = {
            maxRetries: 3,
            requestTimeout: 30000,
            sniffOnStart: true,
            ...config
        };

        this.client = new Client({
            node: this.config.node,
            auth: this.config.auth,
            maxRetries: this.config.maxRetries,
            requestTimeout: this.config.requestTimeout,
            sniffOnStart: this.config.sniffOnStart
        });
    }

    /**
     * Test connection to Elasticsearch
     */
    async connect(): Promise<void> {
        try {
            const health = await this.client.cluster.health();
            this.isConnected = true;
            console.log('Elasticsearch connected:', health.cluster_name);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to connect to Elasticsearch: ${errorMessage}`);
        }
    }

    /**
     * Get the Elasticsearch client instance
     */
    getClient(): Client {
        if (!this.isConnected) {
            throw new Error('Elasticsearch client not connected. Call connect() first.');
        }
        return this.client;
    }

    /**
     * Check if client is connected
     */
    isClientConnected(): boolean {
        return this.isConnected;
    }

    /**
     * Close the Elasticsearch connection
     */
    async close(): Promise<void> {
        await this.client.close();
        this.isConnected = false;
    }

    /**
     * Get cluster health
     */
    async getHealth() {
        return await this.client.cluster.health();
    }

    /**
     * Get cluster stats
     */
    async getStats() {
        return await this.client.cluster.stats();
    }
}

// Create default client instance
const defaultConfig: ElasticsearchConfig = {
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    auth: process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD
        ? {
            username: process.env.ELASTICSEARCH_USERNAME,
            password: process.env.ELASTICSEARCH_PASSWORD
        }
        : undefined
};

export const elasticsearchClient = new ElasticsearchClient(defaultConfig);
