import type { Config } from 'jest';

// Run via `npm test`, not `jest` directly: @nestjs/* ships ESM-only, and
// requiring it needs Node's --experimental-vm-modules, set as NODE_OPTIONS
// on the npm script.
const config: Config = {
  rootDir: '.',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.typecheck.json' }],
  },
  // No DB setup here on purpose: unit tests under src/ mock their
  // dependencies and never touch Postgres — requiring TEST_DATABASE_URL
  // just to run them would fail a contributor with no .env for no reason.
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
};
export default config;
