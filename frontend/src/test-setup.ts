import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Vitest globals are disabled, so register Testing Library cleanup explicitly.
afterEach(() => {
  cleanup();
});
