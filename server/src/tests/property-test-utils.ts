// Property-based testing utilities for eDiscovery Platform
// Uses fast-check for property-based testing

import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';

// Custom arbitraries for eDiscovery domain

// Generate valid ObjectId strings
export const objectIdArb = fc
    .tuple(fc.hexaString({ minLength: 24, maxLength: 24 }))
    .map(([hex]) => new ObjectId(hex).toString());

// Generate valid email addresses
export const emailArb = fc
    .tuple(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.constantFrom('com', 'org', 'net', 'edu', 'gov')
    )
    .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

// Generate valid filenames
export const filenameArb = fc
    .tuple(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.constantFrom('pdf', 'docx', 'xlsx', 'pptx', 'txt', 'eml', 'msg', 'jpg', 'png', 'tiff')
    )
    .map(([name, ext]) => `${name}.${ext}`);

// Generate valid file types (MIME types)
export const fileTypeArb = fc.constantFrom(
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'message/rfc822',
    'image/jpeg',
    'image/png',
    'image/tiff'
);

// Generate valid privilege statuses
export const privilegeStatusArb = fc.constantFrom(
    'NOT_PRIVILEGED',
    'ATTORNEY_CLIENT',
    'WORK_PRODUCT',
    'NEEDS_REVIEW'
);

// Generate valid relevance statuses
export const relevanceStatusArb = fc.constantFrom(
    'HIGHLY_RELEVANT',
    'RELEVANT',
    'NOT_RELEVANT',
    'MARGINAL'
);

// Generate valid user roles
export const userRoleArb = fc.constantFrom(
    'ADMIN',
    'PARTNER',
    'ASSOCIATE',
    'PARALEGAL'
);

// Generate valid case statuses
export const caseStatusArb = fc.constantFrom(
    'ACTIVE',
    'CLOSED',
    'ARCHIVED'
);

// Generate valid production statuses
export const productionStatusArb = fc.constantFrom(
    'DRAFT',
    'IN_REVIEW',
    'APPROVED',
    'PRODUCED'
);

// Generate valid document numbers (DOC-000001 format)
export const docNumberArb = fc
    .integer({ min: 1, max: 999999 })
    .map(num => `DOC-${String(num).padStart(6, '0')}`);

// Generate valid Bates numbers (SET-000001 format)
export const batesNumberArb = fc
    .tuple(
        fc.string({ minLength: 3, maxLength: 6 }),
        fc.integer({ min: 1, max: 999999 })
    )
    .map(([prefix, num]) => `${prefix.toUpperCase()}-${String(num).padStart(6, '0')}`);

// Generate valid dates (within reasonable range)
export const dateArb = fc
    .date({ min: new Date(2000, 0, 1), max: new Date() })
    .map(date => date.toISOString());

// Generate valid file sizes (in bytes)
export const fileSizeArb = fc.integer({ min: 1, max: 100 * 1024 * 1024 }); // Up to 100MB

// Generate valid MD5 hashes (32 hex characters)
export const md5HashArb = fc.hexaString({ minLength: 32, maxLength: 32 });

// Generate valid extracted text
export const extractedTextArb = fc.lorem({ maxCount: 1000 });

// Generate valid document metadata
export const documentMetadataArb = fc.record({
    author: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    createdDate: fc.option(dateArb, { nil: undefined }),
    modifiedDate: fc.option(dateArb, { nil: undefined }),
    pageCount: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: undefined }),
    subject: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
    keywords: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 10 }), { nil: undefined }),
    customFields: fc.record({})
});

// Generate valid document coding
export const documentCodingArb = fc.record({
    privilegeStatus: privilegeStatusArb,
    privilegeReason: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
    relevanceStatus: relevanceStatusArb,
    isConfidential: fc.boolean(),
    reviewNotes: fc.option(fc.string({ minLength: 1, maxLength: 1000 }), { nil: undefined }),
    reviewedAt: fc.option(dateArb, { nil: undefined }),
    updatedAt: fc.option(dateArb, { nil: undefined })
});

// Generate valid document
export const documentArb = fc.record({
    id: objectIdArb,
    caseId: objectIdArb,
    custodianId: objectIdArb,
    docNumber: docNumberArb,
    filename: filenameArb,
    fileType: fileTypeArb,
    fileSize: fileSizeArb,
    filePath: fc.string({ minLength: 1, maxLength: 500 }),
    md5Hash: md5HashArb,
    documentDate: fc.option(dateArb, { nil: undefined }),
    uploadedBy: objectIdArb,
    uploadedAt: dateArb,
    isDuplicate: fc.boolean(),
    masterDocId: fc.option(objectIdArb, { nil: undefined }),
    extractedText: fc.option(extractedTextArb, { nil: undefined }),
    coding: fc.option(documentCodingArb, { nil: undefined }),
    tags: fc.array(objectIdArb, { minLength: 0, maxLength: 10 }),
    createdAt: dateArb,
    updatedAt: dateArb
});

// Generate valid user
export const userArb = fc.record({
    id: objectIdArb,
    email: emailArb,
    firstName: fc.string({ minLength: 1, maxLength: 50 }),
    lastName: fc.string({ minLength: 1, maxLength: 50 }),
    role: userRoleArb,
    isActive: fc.boolean(),
    createdAt: dateArb,
    updatedAt: dateArb
});

// Generate valid case
export const caseArb = fc.record({
    id: objectIdArb,
    caseNumber: fc.string({ minLength: 1, maxLength: 20 }),
    caseName: fc.string({ minLength: 1, maxLength: 100 }),
    clientName: fc.string({ minLength: 1, maxLength: 100 }),
    opposingParty: fc.string({ minLength: 1, maxLength: 100 }),
    description: fc.option(fc.string({ minLength: 1, maxLength: 1000 }), { nil: undefined }),
    status: caseStatusArb,
    createdBy: objectIdArb,
    team: fc.array(
        fc.record({
            user: objectIdArb,
            role: fc.constantFrom('LEAD', 'REVIEWER', 'PARALEGAL'),
            assignedAt: dateArb
        }),
        { minLength: 0, maxLength: 10 }
    ),
    createdAt: dateArb,
    updatedAt: dateArb
});

// Generate valid search query
export const searchQueryArb = fc.record({
    text: fc.string({ minLength: 0, maxLength: 100 }),
    filters: fc.option(
        fc.record({
            dateRange: fc.option(
                fc.record({
                    start: fc.option(dateArb, { nil: undefined }),
                    end: fc.option(dateArb, { nil: undefined })
                }),
                { nil: undefined }
            ),
            fileTypes: fc.option(fc.array(fileTypeArb, { minLength: 0, maxLength: 5 }), { nil: undefined }),
            custodians: fc.option(fc.array(objectIdArb, { minLength: 0, maxLength: 5 }), { nil: undefined }),
            tags: fc.option(fc.array(objectIdArb, { minLength: 0, maxLength: 5 }), { nil: undefined }),
            searchInContent: fc.option(fc.boolean(), { nil: undefined }),
            searchInMetadata: fc.option(fc.boolean(), { nil: undefined })
        }),
        { nil: undefined }
    ),
    page: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
    pageSize: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined })
});

// Generate valid redaction
export const redactionArb = fc.record({
    id: objectIdArb,
    documentId: objectIdArb,
    position: fc.record({
        x: fc.integer({ min: 0, max: 1000 }),
        y: fc.integer({ min: 0, max: 1000 }),
        width: fc.integer({ min: 1, max: 500 }),
        height: fc.integer({ min: 1, max: 500 })
    }),
    page: fc.integer({ min: 1, max: 100 }),
    reason: fc.string({ minLength: 1, maxLength: 200 }),
    appliedBy: objectIdArb,
    appliedAt: dateArb,
    reviewedBy: fc.option(objectIdArb, { nil: undefined }),
    reviewedAt: fc.option(dateArb, { nil: undefined }),
    isApproved: fc.option(fc.boolean(), { nil: undefined })
});

// Generate valid production config
export const productionConfigArb = fc.record({
    name: fc.string({ minLength: 1, maxLength: 100 }),
    caseId: objectIdArb,
    documentIds: fc.array(objectIdArb, { minLength: 1, maxLength: 100 }),
    numberingFormat: fc.string({ minLength: 1, maxLength: 20 }),
    includeRedactions: fc.boolean(),
    outputFormat: fc.constantFrom('pdf', 'tiff', 'native', 'all'),
    metadataFields: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 10 }),
    deliveryMethod: fc.option(fc.constantFrom('download', 'email', 'ftp'), { nil: undefined }),
    deliveryRecipient: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined })
});

// Property test runner utilities
export const propertyTest = {
    // Run a property test with configuration
    run: <TArgs extends unknown[]>(
        property: fc.IProperty<TArgs>,
        options?: fc.Parameters<TArgs>
    ) => {
        const defaultOptions: fc.Parameters<TArgs> = {
            numRuns: process.env.CI ? 100 : 50,
            interruptAfterTimeLimit: 30000, // 30 seconds
            markInterruptAsFailure: true,
            verbose: process.env.CI ? 0 : 1,
            seed: process.env.TEST_SEED ? parseInt(process.env.TEST_SEED) : undefined
        };

        return fc.assert(property, { ...defaultOptions, ...options });
    },

    // Test that a function always returns true for all inputs
    alwaysTrue: <T>(
        arbitrary: fc.Arbitrary<T>,
        predicate: (value: T) => boolean,
        options?: fc.Parameters<[T]>
    ) => {
        return propertyTest.run(
            fc.property(arbitrary, predicate),
            options
        );
    },

    // Test that a function never returns true for any input
    neverTrue: <T>(
        arbitrary: fc.Arbitrary<T>,
        predicate: (value: T) => boolean,
        options?: fc.Parameters<[T]>
    ) => {
        return propertyTest.run(
            fc.property(arbitrary, value => !predicate(value)),
            options
        );
    },

    // Test that two functions are equivalent
    equivalent: <T, R>(
        arbitrary: fc.Arbitrary<T>,
        f1: (value: T) => R,
        f2: (value: T) => R,
        options?: fc.Parameters<[T]>
    ) => {
        return propertyTest.run(
            fc.property(arbitrary, value => f1(value) === f2(value)),
            options
        );
    },

    // Test that a function is idempotent
    idempotent: <T>(
        arbitrary: fc.Arbitrary<T>,
        f: (value: T) => T,
        options?: fc.Parameters<[T]>
    ) => {
        return propertyTest.run(
            fc.property(arbitrary, value => {
                const once = f(value);
                const twice = f(once);
                return JSON.stringify(once) === JSON.stringify(twice);
            }),
            options
        );
    },

    // Test that a function preserves a property
    preserves: <T>(
        arbitrary: fc.Arbitrary<T>,
        f: (value: T) => T,
        property: (value: T) => boolean,
        options?: fc.Parameters<[T]>
    ) => {
        return propertyTest.run(
            fc.property(arbitrary, value => {
                if (property(value)) {
                    return property(f(value));
                }
                return true; // If property doesn't hold for input, we don't care about output
            }),
            options
        );
    }
};

// Helper to create test documents in database
export const createTestDocument = async (overrides = {}) => {
    const Document = mongoose.model('Document');
    const document = new Document({
        caseId: new ObjectId(),
        custodianId: new ObjectId(),
        docNumber: 'DOC-000001',
        filename: 'test-document.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
        filePath: '/uploads/test/test-document.pdf',
        md5Hash: 'test-md5-hash',
        uploadedBy: new ObjectId(),
        uploadedAt: new Date(),
        isDuplicate: false,
        extractedText: 'This is test document content for testing purposes.',
        coding: {
            privilegeStatus: 'NOT_PRIVILEGED',
            relevanceStatus: 'RELEVANT',
            isConfidential: false,
            reviewedAt: new Date(),
        },
        tags: [],
        ...overrides
    });
    return await document.save();
};

// Helper to create test user in database
export const createTestUser = async (overrides = {}) => {
    const User = mongoose.model('User');
    const user = new User({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'ASSOCIATE',
        isActive: true,
        ...overrides
    });
    return await user.save();
};

// Helper to create test case in database
export const createTestCase = async (overrides = {}) => {
    const Case = mongoose.model('Case');
    const caseDoc = new Case({
        caseNumber: 'CASE-2024-001',
        caseName: 'Test Case',
        clientName: 'Test Client',
        opposingParty: 'Test Opposing Party',
        status: 'ACTIVE',
        createdBy: new ObjectId(),
        team: [],
        ...overrides
    });
    return await caseDoc.save();
};

// Cleanup helper
export const cleanupTestData = async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
};