import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { ROOT_ENV_PATH } from '../root-env-path';

config({ path: ROOT_ENV_PATH });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    `DATABASE_URL is not set (looked for it in ${ROOT_ENV_PATH}) — copy .env.example to .env first.`,
  );
}
export const DATABASE_URL: string = databaseUrl;
export const queryClient = postgres(DATABASE_URL);
export const db = drizzle(queryClient, { schema });

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
