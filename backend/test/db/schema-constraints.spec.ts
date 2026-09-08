import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../../src/db/schema';
import {
  causeCode as extractCode,
  CHECK_VIOLATION,
  UNIQUE_VIOLATION,
  FOREIGN_KEY_VIOLATION,
} from '../../src/db/postgres-error';
import { ALL_TABLE_NAMES } from '../../src/db/schema-table-names';

const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function causeCode(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
    return undefined;
  } catch (err) {
    return extractCode(err);
  }
}

afterAll(() => sql.end());

describe('reviews index definitions', () => {
  // Asserts the exact column list, not just the absence of "NULLS LAST":
  // Postgres also omits any NULLS clause from a plain ascending index, so a
  // regression that dropped .desc() entirely would false-pass a check that
  // only looked for that text.
  it.each([
    ['reviews_product_created_idx', '(product_id, created_at DESC, id DESC)'],
    ['reviews_product_rating_idx', '(product_id, rating DESC, created_at DESC, id DESC)'],
    [
      'reviews_product_verified_idx',
      '(product_id, created_at DESC, id DESC) WHERE (is_verified = true)',
    ],
  ])('%s is ordered %s', async (indexName, expected) => {
    const [row] = await sql`SELECT indexdef FROM pg_indexes WHERE indexname = ${indexName}`;
    expect(row).toBeDefined();
    expect(row.indexdef).toContain(expected);
  });
});

describe('schema constraints', () => {
  let productId: string;
  let userId: string;

  async function insertReview(rating: number, body: string): Promise<string> {
    const [row] = await db
      .insert(schema.reviews)
      .values({ productId, userId, rating, body, isVerified: false })
      .returning({ id: schema.reviews.id });

    return row.id;
  }

  beforeEach(async () => {
    await sql.unsafe(`TRUNCATE ${ALL_TABLE_NAMES.join(', ')} CASCADE`);
    [{ id: userId }] = await db
      .insert(schema.users)
      .values({ name: 'Test User', email: `u-${Date.now()}@test.dev`, tokenHash: 'x' })
      .returning({ id: schema.users.id });
    [{ id: productId }] = await db
      .insert(schema.products)
      .values({ name: 'Test Product', slug: `p-${Date.now()}`, priceCents: 1000, category: 'test' })
      .returning({ id: schema.products.id });
    await db.insert(schema.ratingAggregates).values({ productId });
  });

  it('rejects a rating above 5', async () => {
    const code = await causeCode(
      db.insert(schema.reviews).values({
        productId,
        userId,
        rating: 6,
        body: 'x',
        isVerified: false,
      }),
    );
    expect(code).toBe(CHECK_VIOLATION);
  });

  it('rejects a rating below 1', async () => {
    const code = await causeCode(
      db.insert(schema.reviews).values({
        productId,
        userId,
        rating: 0,
        body: 'x',
        isVerified: false,
      }),
    );
    expect(code).toBe(CHECK_VIOLATION);
  });

  it('rejects a negative helpful_count', async () => {
    const code = await causeCode(
      db.insert(schema.reviews).values({
        productId,
        userId,
        rating: 5,
        body: 'x',
        isVerified: false,
        helpfulCount: -1,
      }),
    );
    expect(code).toBe(CHECK_VIOLATION);
  });

  it('rejects a second review by the same user for the same product', async () => {
    await insertReview(5, 'first');
    const code = await causeCode(insertReview(3, 'second'));
    expect(code).toBe(UNIQUE_VIOLATION);
  });

  it('rejects a duplicate helpful vote from the same user on the same review', async () => {
    const reviewId = await insertReview(5, 'x');
    await db.insert(schema.reviewHelpfulVotes).values({ reviewId, userId });
    const code = await causeCode(db.insert(schema.reviewHelpfulVotes).values({ reviewId, userId }));
    expect(code).toBe(UNIQUE_VIOLATION);
  });

  it('rejects a rating_aggregates row with no matching product', async () => {
    const code = await causeCode(
      db
        .insert(schema.ratingAggregates)
        .values({ productId: '00000000-0000-0000-0000-000000000000' }),
    );
    expect(code).toBe(FOREIGN_KEY_VIOLATION);
  });

  it('rejects a rating_aggregates update where the counts do not sum to review_count', async () => {
    const code = await causeCode(
      db
        .update(schema.ratingAggregates)
        .set({ reviewCount: 2, count5: 1 }) // counts sum to 1, review_count claims 2
        .where(eq(schema.ratingAggregates.productId, productId)),
    );
    expect(code).toBe(CHECK_VIOLATION);
  });

  it('rejects a rating_aggregates update where rating_sum does not match the weighted counts', async () => {
    const code = await causeCode(
      db
        .update(schema.ratingAggregates)
        .set({ reviewCount: 1, count5: 1, ratingSum: 3 }) // one 5-star review must sum to 5, not 3
        .where(eq(schema.ratingAggregates.productId, productId)),
    );
    expect(code).toBe(CHECK_VIOLATION);
  });

  it('rejects a rating_aggregates update with a negative count', async () => {
    // reviewCount and ratingSum move to match, so this would otherwise
    // satisfy both sum-equality checks despite being nonsensical.
    const code = await causeCode(
      db
        .update(schema.ratingAggregates)
        .set({ reviewCount: -1, ratingSum: -5, count5: -1 })
        .where(eq(schema.ratingAggregates.productId, productId)),
    );
    expect(code).toBe(CHECK_VIOLATION);
  });
});
