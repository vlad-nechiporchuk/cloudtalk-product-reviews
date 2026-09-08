import { config } from 'dotenv';
import { ROOT_ENV_PATH } from '../src/root-env-path';

config({ path: ROOT_ENV_PATH });

if (!process.env.TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL is not set — copy .env.example to .env first.');
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
