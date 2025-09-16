/**
 * Jest configuration for TypeScript, ESM, and path aliases
 * See https://jestjs.io/docs/configuration for details
 */

const config = {
  preset: 'ts-jest/presets/default-esm',
  // preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: './tsconfig.json',
      }
    ]
  },
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/*.test.ts',
    '**/*.integration.test.ts'
  ],
  moduleNameMapper: {
    // '^#src/(.*)$': '<rootDir>/src/$1',
    // '^#test/(.*)$': '<rootDir>/tests/$1'
    '^#src/(.*)\\.js$': '<rootDir>/src/$1.ts',
    '^#test/(.*)\\.js$': '<rootDir>/tests/$1.ts'
  },
  collectCoverage: true,
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  setupFiles: ['dotenv/config'],
  resolver: 'ts-jest-resolver',
};

export default config;
