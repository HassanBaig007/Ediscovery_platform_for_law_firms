// Test setup for eDiscovery Platform Core Enhancement
// This file configures the testing environment for property-based testing

import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Global test configuration
global.jest = jest;
jest.setTimeout(600000);

// MongoDB Memory Server for testing
let mongoServer: MongoMemoryServer | undefined;
const shouldUseMongoMemory = process.env.USE_MONGO_MEMORY === 'true';

// Setup before all tests
beforeAll(async () => {
    if (!shouldUseMongoMemory) {
        return;
    }

    // Start MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Connect to test database (no options needed for mongoose 6+)
    await mongoose.connect(mongoUri);
});

// Cleanup after each test
afterEach(async () => {
    if (!shouldUseMongoMemory || mongoose.connection.readyState !== 1) {
        return;
    }

    // Clear all collections
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

// Cleanup after all tests
afterAll(async () => {
    if (!shouldUseMongoMemory) {
        return;
    }

    // Disconnect from database
    await mongoose.disconnect();
    
    // Stop MongoDB Memory Server
    if (mongoServer) {
        await mongoServer.stop();
    }
});

// Test utilities
export const testUtils = {
    // Generate test documents
    generateTestDocument: (overrides = {}) => ({
        caseId: 'test-case-id',
        custodianId: 'test-custodian-id',
        docNumber: 'DOC-000001',
        filename: 'test-document.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
        filePath: '/uploads/test/test-document.pdf',
        md5Hash: 'test-md5-hash',
        uploadedBy: 'test-user-id',
        uploadedAt: new Date(),
        isDuplicate: false,
        extractedText: 'This is test document content for testing purposes.',
        coding: {
            privilegeStatus: 'NOT_PRIVILEGED' as const,
            relevanceStatus: 'RELEVANT' as const,
            isConfidential: false,
            reviewedAt: new Date(),
        },
        tags: [],
        ...overrides,
    }),

    // Generate test user
    generateTestUser: (overrides = {}) => ({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'ASSOCIATE' as const,
        isActive: true,
        ...overrides,
    }),

    // Generate test case
    generateTestCase: (overrides = {}) => ({
        caseNumber: 'CASE-2024-001',
        caseName: 'Test Case',
        clientName: 'Test Client',
        opposingParty: 'Test Opposing Party',
        status: 'ACTIVE' as const,
        createdBy: 'test-user-id',
        team: [],
        ...overrides,
    }),

    // Wait for async operations
    wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
};

// Property-based testing configuration
export const propertyTestConfig = {
    // Number of test cases to generate for each property
    numTests: process.env.CI ? 100 : 50,
    
    // Maximum size of generated data
    maxSize: 100,
    
    // Seed for reproducible tests
    seed: process.env.TEST_SEED ? parseInt(process.env.TEST_SEED) : Date.now(),
    
    // Timeout for property tests (in milliseconds)
    timeout: 30000,
};

// Test doubles for external services
export const mockServices = {
    // Mock OCR service
    ocrService: {
        extractText: jest.fn<any>().mockResolvedValue({
            content: 'Mock extracted text',
            metadata: {
                pageCount: 1,
                wordCount: 10,
                characterCount: 50,
                language: 'en',
            },
        }),
    },

    // Mock search index service
    searchIndexService: {
        indexDocument: jest.fn<any>().mockResolvedValue(undefined),
        search: jest.fn<any>().mockResolvedValue({
            documents: [],
            total: 0,
            page: 1,
            pageSize: 10,
            totalPages: 0,
        }),
        deleteDocument: jest.fn<any>().mockResolvedValue(undefined),
    },

    // Mock file storage service
    fileStorageService: {
        saveFile: jest.fn<any>().mockResolvedValue({
            filePath: '/uploads/mock/file.pdf',
            size: 1024,
            mimeType: 'application/pdf',
        }),
        getFileStream: jest.fn<any>().mockReturnValue({
            pipe: jest.fn(),
            on: jest.fn(),
        }),
        deleteFile: jest.fn<any>().mockResolvedValue(undefined),
    },

    // Mock email service
    emailService: {
        sendNotification: jest.fn<any>().mockResolvedValue(undefined),
        sendPasswordReset: jest.fn<any>().mockResolvedValue(undefined),
    },
};

// Test data generators for property-based testing
export const generators = {
    // Generate random string
    string: (minLength = 1, maxLength = 100) => {
        const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    // Generate random number
    number: (min = 0, max = 1000) => Math.floor(Math.random() * (max - min + 1)) + min,

    // Generate random date
    date: (start = new Date(2020, 0, 1), end = new Date()) => {
        const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
        return date;
    },

    // Generate random boolean
    boolean: () => Math.random() > 0.5,

    // Generate random array
    array: <T>(generator: () => T, minLength = 0, maxLength = 10): T[] => {
        const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
        const result: T[] = [];
        for (let i = 0; i < length; i++) {
            result.push(generator());
        }
        return result;
    },

    // Generate random object
    object: <T extends Record<string, any>>(schema: { [K in keyof T]: () => T[K] }): T => {
        const result: any = {};
        for (const key in schema) {
            result[key] = schema[key]();
        }
        return result;
    },

    // Generate random file
    file: () => ({
        originalname: `test-file-${generators.number(1, 1000)}.pdf`,
        mimetype: 'application/pdf',
        size: generators.number(100, 1000000),
        buffer: Buffer.from(generators.string(100, 10000)),
    }),
};