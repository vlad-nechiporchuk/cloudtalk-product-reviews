import type { Config } from 'jest';

// Sharing this with jest.config.ts via an import was tried and reverted:
// Jest's own TS-config loader doesn't follow this project's "nodenext"
// module resolution, so a relative import here fails regardless of
// extension. Small, deliberate duplication instead.
//
// test/ uses both spec conventions: *.spec.ts and *.e2e-spec.ts. All these
// files hit one real reviews_test database, and one of them TRUNCATEs it —
// maxWorkers: 1 keeps that safe, not just faster.
const config: Config = {
  rootDir: '.',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.typecheck.json' }],
  },
  testMatch: ['<rootDir>/test/**/*.spec.ts', '<rootDir>/test/**/*.e2e-spec.ts'],
  globalSetup: '<rootDir>/test/verify-test-database.ts',
  setupFiles: ['<rootDir>/test/set-test-database-url.ts'],
  maxWorkers: 1,
};
export default config;
