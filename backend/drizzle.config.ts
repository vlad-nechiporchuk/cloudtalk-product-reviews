import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import { ROOT_ENV_PATH } from './src/root-env-path';

config({ path: ROOT_ENV_PATH });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    `DATABASE_URL is not set (looked for it in ${ROOT_ENV_PATH}) — copy .env.example to .env first.`,
  );
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: connectionString },
});
