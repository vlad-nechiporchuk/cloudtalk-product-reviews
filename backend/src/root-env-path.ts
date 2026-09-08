import { resolve } from 'node:path';

// .env lives at the repo root, one level above backend/ — every consumer
// (the app itself, and two Jest setup files that run outside it) needs the
// same __dirname-relative resolution, not one relative to process.cwd().
export const ROOT_ENV_PATH = resolve(__dirname, '..', '..', '.env');
