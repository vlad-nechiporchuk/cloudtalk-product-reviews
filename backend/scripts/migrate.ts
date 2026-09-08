import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { ROOT_ENV_PATH } from '../src/root-env-path';
import { maskDatabaseUrl } from '../src/db/mask-database-url';

config({ path: ROOT_ENV_PATH });

async function main(): Promise<void> {
  const target = process.env.MIGRATE_TARGET;
  if (target !== undefined && target !== 'test') {
    throw new Error(`MIGRATE_TARGET must be unset or "test", got ${JSON.stringify(target)}.`);
  }
  const isTest = target === 'test';
  const url = isTest ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      `${isTest ? 'TEST_DATABASE_URL' : 'DATABASE_URL'} is not set — copy .env.example to .env first.`,
    );
  }
  const client = postgres(url, { max: 1 });
  try {
    await migrate(drizzle(client), { migrationsFolder: './drizzle' });
    console.log(`Migrations applied to ${maskDatabaseUrl(url)}.`);
  } finally {
    await client.end();
  }
}
main().catch((err) => {
  console.error('Migration failed', err);
  process.exitCode = 1;
});
