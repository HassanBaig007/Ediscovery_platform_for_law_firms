/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: [
        '**/__tests__/**/*.ts',
        '**/?(*.)+(spec|test).ts',
        '**/tests/**/*.test.ts',
        '**/property-tests/**/*.test.ts'
    ],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/tests/**/*.ts',
        '!src/**/index.ts'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1'
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: 'tsconfig.json',
            isolatedModules: true
        }]
    },
    testTimeout: 30000,
    verbose: true,
    // Property-based testing configuration
    globals: {
        'ts-jest': {
            diagnostics: {
                warnOnly: true
            }
        }
    },
    // Test file patterns
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/'
    ],
    // Watch mode configuration
    watchPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/coverage/'
    ],
    // Property test specific configuration
    testEnvironmentOptions: {
        url: 'http://localhost'
    }
};