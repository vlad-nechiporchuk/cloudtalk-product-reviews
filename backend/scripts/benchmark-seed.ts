import { sql } from 'drizzle-orm';
import { DATABASE_URL, db, queryClient } from '../src/db/client';
import { assertLocalDatabase } from '../src/db/assert-local-database';
import { maskDatabaseUrl } from '../src/db/mask-database-url';
import { users, products, ratingAggregates } from '../src/db/schema';

const BATCH = 5000;
const HOT_PRODUCT_REVIEWS = 300_000;
const OTHER_PRODUCTS = 99;
const REVIEWS_PER_OTHER_PRODUCT = Math.round((1_000_000 - HOT_PRODUCT_REVIEWS) / OTHER_PRODUCTS);
// The unique constraint is per product+user, not global, so the other 99
// products reuse a slice of this same pool (never twice for the SAME
// product) — only the hot product's review count sets the floor. +5,000 is
// slack, not a requirement.
const TOTAL_USERS = HOT_PRODUCT_REVIEWS + 5_000;

async function insertUsersBatch(startIndex: number, count: number): Promise<string[]> {
  const rows = Array.from({ length: count }, (_, i) => ({
    name: `Bench User ${startIndex + i}`,
    email: `bench-${startIndex + i}@bench.dev`,
    // Real, unique per row — the column is UNIQUE, so the fixed placeholder
    // string a demo seed can get away with (one row) would collide here.
    tokenHash: `bench-token-${startIndex + i}`,
  }));
  const inserted = await db.insert(users).values(rows).returning({ id: users.id });

  return inserted.map((u) => u.id);
}

async function seedReviewsForProduct(
  productId: string,
  count: number,
  userIds: string[],
): Promise<void> {
  for (let i = 0; i < count; i += BATCH) {
    const batchSize = Math.min(BATCH, count - i);
    const rows = Array.from({ length: batchSize }, (_, j) => ({
      productId,
      userId: userIds[i + j],
      rating: Math.floor(Math.random() * 5) + 1,
      body: `Benchmark review body ${i + j}`,
      isVerified: Math.random() < 0.4,
      createdAt: new Date(Date.now() - (count - i - j) * 1000).toISOString(),
    }));

    // Raw postgres.js UNNEST, not drizzle's `sql` helper: drizzle's `sql`
    // tag spreads a JS array into one placeholder per element (built for
    // `IN (...)`), which is the wrong shape for UNNEST and silently wrong
    // at any batch size — postgres.js's own tag serializes an array-typed
    // parameter, via `.array()`, as a single Postgres array instead.
    await queryClient`
      INSERT INTO reviews (product_id, user_id, rating, body, is_verified, created_at)
      SELECT * FROM UNNEST(
        ${queryClient.array(rows.map((r) => r.productId))}::uuid[],
        ${queryClient.array(rows.map((r) => r.userId))}::uuid[],
        ${queryClient.array(rows.map((r) => r.rating))}::smallint[],
        ${queryClient.array(rows.map((r) => r.body))}::text[],
        ${queryClient.array(rows.map((r) => r.isVerified))}::boolean[],
        ${queryClient.array(rows.map((r) => r.createdAt))}::timestamptz[]
      )
    `;
  }
}

async function refreshAggregate(productId: string): Promise<void> {
  await db.execute(sql`
    UPDATE rating_aggregates SET
      review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = ${productId}),
      rating_sum = (SELECT COALESCE(SUM(rating), 0) FROM reviews WHERE product_id = ${productId}),
      count_1 = (SELECT COUNT(*) FROM reviews WHERE product_id = ${productId} AND rating = 1),
      count_2 = (SELECT COUNT(*) FROM reviews WHERE product_id = ${productId} AND rating = 2),
      count_3 = (SELECT COUNT(*) FROM reviews WHERE product_id = ${productId} AND rating = 3),
      count_4 = (SELECT COUNT(*) FROM reviews WHERE product_id = ${productId} AND rating = 4),
      count_5 = (SELECT COUNT(*) FROM reviews WHERE product_id = ${productId} AND rating = 5)
    WHERE product_id = ${productId}
  `);
}

// User emails/token hashes below are index-derived, not random, so a
// second run collides on the first batch's UNIQUE columns instead of
// producing more data — and a run that fails partway (a batch throws)
// leaves that product's rows committed with no rating_aggregates refresh,
// since each UNNEST insert commits on its own with no wrapping transaction.
// Failing loud here, before any insert, turns both cases into one obvious
// fix instead of a confusing unique-violation deep into a multi-minute run.
async function assertNoExistingBenchmarkData(): Promise<void> {
  const [{ count }] = await queryClient<[{ count: number }]>`
    SELECT count(*)::int AS count FROM products WHERE category = 'benchmark'
  `;
  if (count > 0) {
    throw new Error(
      `Found ${count} existing benchmark product(s) — this script can't be safely rerun over ` +
        'them. Wipe the previous run first:\n' +
        "  DELETE FROM reviews WHERE product_id IN (SELECT id FROM products WHERE category = 'benchmark');\n" +
        "  DELETE FROM rating_aggregates WHERE product_id IN (SELECT id FROM products WHERE category = 'benchmark');\n" +
        "  DELETE FROM products WHERE category = 'benchmark';\n" +
        "  DELETE FROM users WHERE email LIKE 'bench-%@bench.dev';",
    );
  }
}

async function main(): Promise<void> {
  assertLocalDatabase(DATABASE_URL);
  await assertNoExistingBenchmarkData();
  console.log(`Seeding benchmark data into ${maskDatabaseUrl(DATABASE_URL)} (several minutes)...`);

  console.log(`Seeding ${TOTAL_USERS} users in batches of ${BATCH}...`);
  const userIds: string[] = [];
  for (let i = 0; i < TOTAL_USERS; i += BATCH) {
    const inserted = await insertUsersBatch(i, Math.min(BATCH, TOTAL_USERS - i));
    userIds.push(...inserted);
    if (i % (BATCH * 10) === 0) {
      console.log(`  ${i} users`);
    }
  }

  const [hotProduct] = await db
    .insert(products)
    .values({
      name: 'Benchmark Hot Product',
      slug: `bench-hot-${Date.now()}`,
      priceCents: 1000,
      category: 'benchmark',
    })
    .returning();
  await db.insert(ratingAggregates).values({ productId: hotProduct.id });

  console.log(`Seeding ${HOT_PRODUCT_REVIEWS} reviews for the hot product...`);
  await seedReviewsForProduct(hotProduct.id, HOT_PRODUCT_REVIEWS, userIds);
  await refreshAggregate(hotProduct.id);

  console.log(
    `Seeding ${OTHER_PRODUCTS} more products with ${REVIEWS_PER_OTHER_PRODUCT} reviews each...`,
  );
  const otherProductUserIds = userIds.slice(0, REVIEWS_PER_OTHER_PRODUCT);
  for (let p = 0; p < OTHER_PRODUCTS; p++) {
    const [product] = await db
      .insert(products)
      .values({
        name: `Benchmark Product ${p}`,
        slug: `bench-${p}-${Date.now()}`,
        priceCents: 1000,
        category: 'benchmark',
      })
      .returning();
    await db.insert(ratingAggregates).values({ productId: product.id });
    await seedReviewsForProduct(product.id, REVIEWS_PER_OTHER_PRODUCT, otherProductUserIds);
    await refreshAggregate(product.id);
    if (p % 10 === 0) {
      console.log(`  product ${p}/${OTHER_PRODUCTS}`);
    }
  }

  console.log(`Done. Hot product id: ${hotProduct.id}`);
  // VACUUM, not bare ANALYZE: ANALYZE alone updates planner statistics but
  // never touches the visibility map, which a bulk insert leaves entirely
  // empty — so the query plan benchmark-queries.ts sees would depend on
  // whether autovacuum happened to run yet, making the comparison
  // non-reproducible. VACUUM can't run inside a transaction block or a
  // prepared statement, hence .simple() instead of db.execute(sql`...`).
  await queryClient.unsafe('VACUUM (ANALYZE) reviews').simple();
  await queryClient.unsafe('VACUUM (ANALYZE) rating_aggregates').simple();
}

main()
  .catch((err) => {
    console.error('Benchmark seed failed', err);
    process.exitCode = 1;
  })
  .finally(() => queryClient.end());
