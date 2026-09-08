import { config } from 'dotenv';
import postgres from 'postgres';
import { ROOT_ENV_PATH } from '../src/root-env-path';

// Jest globalSetup: runs once, awaited, before any worker/test file — a
// stale pg-data Docker volume predating docker/init-test-db.sql would
// otherwise surface only much later, as a random driver error deep inside
// whichever test happens to run first.
export default async function globalSetup() {
  config({ path: ROOT_ENV_PATH });

  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error('TEST_DATABASE_URL is not set — copy .env.example to .env first.');
  }
  const maskedUrl = url.replace(/:[^:@]*@/, ':***@');

  const sql = postgres(url, { max: 1 });
  try {
    await sql`select 1`;
  } catch (err) {
    const code = (err as { code?: string } | undefined)?.code;
    const message = err instanceof Error ? err.message : String(err);

    // 3D000 = "database does not exist" — the one case this project's own
    // setup can cause (a pg-data volume older than docker/init-test-db.sql).
    // Fix: create the missing database, not `docker compose down -v` —
    // that also destroys the `reviews` database's dev/demo data, which has
    // nothing to do with this problem.
    if (code === '3D000') {
      throw new Error(
        `TEST_DATABASE_URL (${maskedUrl}) points at a database that doesn't exist. This happens when ` +
          `the Postgres Docker volume predates docker/init-test-db.sql. Fix without touching dev data: ` +
          `docker compose exec postgres psql -U reviews -c "CREATE DATABASE reviews_test". ` +
          `Original error: ${message}`,
      );
    }

    // Any other failure (wrong credentials, Postgres not running, network
    // issue, ...) is unrelated to the database existing or not — don't
    // suggest a destructive volume reset for it.
    throw new Error(
      `Could not connect to TEST_DATABASE_URL (${maskedUrl}). Check that "docker compose up -d" is ` +
        `running and that the credentials in .env match docker-compose.yml. Original error: ${message}`,
    );
  } finally {
    await sql.end();
  }
}
