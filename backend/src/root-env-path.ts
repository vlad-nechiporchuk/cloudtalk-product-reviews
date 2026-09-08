import { resolve } from 'node:path';

// Resolve the root .env independently of process.cwd().
export const ROOT_ENV_PATH = resolve(__dirname, '..', '..', '.env');
