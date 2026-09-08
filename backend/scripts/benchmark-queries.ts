import type { PendingQuery, Row } from 'postgres';
import { DATABASE_URL, queryClient } from '../src/db/client';
import { assertLocalDatabase } from '../src/db/assert-local-database';

const REPEATS = 3;

// Measure plain queries separately from EXPLAIN ANALYZE overhead.
async function measure(label: string, makeQuery: () => PendingQuery<Row[]>): Promise<void> {
  console.log(`\n=== ${label} ===`);

  const times: number[] = [];
  for (let i = 0; i < REPEATS; i++) {
    const start = performance.now();
    await makeQuery();
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);

  const plan = await queryClient<
    Record<string, string>[]
  >`EXPLAIN (ANALYZE, BUFFERS) ${makeQuery()}`;
  console.log(plan.map((r) => r['QUERY PLAN']).join('\n'));
  console.log(
    `wall time over ${REPEATS} plain runs (no EXPLAIN overhead): ` +
      `min ${times[0].toFixed(1)}ms, median ${times[Math.floor(REPEATS / 2)].toFixed(1)}ms`,
  );
}

async function main(): Promise<void> {
  assertLocalDatabase(DATABASE_URL);

  const [hotProduct] = await queryClient`
    SELECT product_id AS id FROM rating_aggregates ORDER BY review_count DESC LIMIT 1
  `;
  if (!hotProduct) {
    throw new Error('No rating_aggregates rows found — run `npm run benchmark:seed` first.');
  }
  const { id: hotProductId } = hotProduct;

  await measure(
    'Naive rating aggregation (AVG/COUNT over reviews)',
    () => queryClient`SELECT AVG(rating), COUNT(*) FROM reviews WHERE product_id = ${hotProductId}`,
  );

  await measure(
    'Denormalized rating read (rating_aggregates by PK)',
    () => queryClient`SELECT rating_sum::numeric / NULLIF(review_count, 0), review_count
                       FROM rating_aggregates WHERE product_id = ${hotProductId}`,
  );

  await measure(
    'Offset pagination, page 1 (OFFSET 0)',
    () => queryClient`SELECT * FROM reviews WHERE product_id = ${hotProductId}
                       ORDER BY created_at DESC, id DESC LIMIT 20 OFFSET 0`,
  );

  await measure(
    'Offset pagination, deep page (OFFSET 100000)',
    () => queryClient`SELECT * FROM reviews WHERE product_id = ${hotProductId}
                       ORDER BY created_at DESC, id DESC LIMIT 20 OFFSET 100000`,
  );

  const [cursorRow] = await queryClient`
    SELECT created_at, id FROM reviews WHERE product_id = ${hotProductId}
    ORDER BY created_at DESC, id DESC OFFSET 99999 LIMIT 1
  `;
  if (!cursorRow) {
    throw new Error(
      'The hot product has fewer than 100,000 reviews — this benchmark needs the real ' +
        '`npm run benchmark:seed` volume (300,000 for the hot product) to be meaningful.',
    );
  }
  await measure(
    'Keyset pagination, equivalent deep page',
    () => queryClient`SELECT * FROM reviews WHERE product_id = ${hotProductId}
                       AND (created_at, id) < (${cursorRow.created_at}, ${cursorRow.id})
                       ORDER BY created_at DESC, id DESC LIMIT 20`,
  );

  const offsetRows = await queryClient`
    SELECT id FROM reviews WHERE product_id = ${hotProductId}
    ORDER BY created_at DESC, id DESC LIMIT 20 OFFSET 100000`;
  const keysetRows = await queryClient`
    SELECT id FROM reviews WHERE product_id = ${hotProductId}
    AND (created_at, id) < (${cursorRow.created_at}, ${cursorRow.id})
    ORDER BY created_at DESC, id DESC LIMIT 20`;
  const offsetIds = offsetRows.map((r) => r.id as string).sort();
  const keysetIds = keysetRows.map((r) => r.id as string).sort();
  const rowsMatch = JSON.stringify(offsetIds) === JSON.stringify(keysetIds);
  console.log(
    `\nOffset page and keyset page return the same ${offsetIds.length} rows: ${rowsMatch}`,
  );
  if (!rowsMatch) {
    throw new Error(
      'Offset and keyset "equivalent" pages returned different rows — the timing comparison ' +
        'above is not valid as-is; fix the cursor before trusting it.',
    );
  }
}

main()
  .catch((err) => {
    console.error('Benchmark queries failed', err);
    process.exitCode = 1;
  })
  .finally(() => queryClient.end());
