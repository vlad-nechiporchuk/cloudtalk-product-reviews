import { config } from 'dotenv';
import postgres from 'postgres';
import { ROOT_ENV_PATH } from '../src/root-env-path';
import { maskDatabaseUrl } from '../src/db/mask-database-url';

export default async function globalSetup(): Promise<void> {
  config({ path: ROOT_ENV_PATH });

  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error('TEST_DATABASE_URL is not set — copy .env.example to .env first.');
  }
  const maskedUrl = maskDatabaseUrl(url);

  const sql = postgres(url, { max: 1 });
  try {
    await sql`select 1`;
  } catch (err) {
    const code = (err as { code?: string } | undefined)?.code;
    const message = err instanceof Error ? err.message : String(err);

    // 3D000 = database doesn't exist — happens when the Postgres volume
    // predates docker/init-test-db.sql. Fix by creating it; don't suggest
    // `docker compose down -v`, which would also wipe dev data unrelated
    // to this problem.
    if (code === '3D000') {
      throw new Error(
        `TEST_DATABASE_URL (${maskedUrl}) points at a database that doesn't exist. This happens when ` +
          `the Postgres Docker volume predates docker/init-test-db.sql. Fix without touching dev data: ` +
          `docker compose exec postgres psql -U reviews -c "CREATE DATABASE reviews_test". ` +
          `Original error: ${message}`,
      );
    }

    throw new Error(
      `Could not connect to TEST_DATABASE_URL (${maskedUrl}). Check that "docker compose up -d" is ` +
        `running and that the credentials in .env match docker-compose.yml. Original error: ${message}`,
    );
  } finally {
    await sql.end();
  }
}
