import type { Config } from 'jest';

// *.spec.ts and *.e2e-spec.ts here all hit one real reviews_test
// database; maxWorkers: 1 keeps concurrent access safe.
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
