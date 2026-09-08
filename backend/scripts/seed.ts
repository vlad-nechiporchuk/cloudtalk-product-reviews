import { sql } from 'drizzle-orm';
import { DATABASE_URL, db, queryClient } from '../src/db/client';
import type { Tx } from '../src/db/client';
import { assertLocalDatabase } from '../src/db/assert-local-database';
import { hashToken } from '../src/auth/hash-token';
import { maskDatabaseUrl } from '../src/db/mask-database-url';
import { RatingAggregateRepository } from '../src/ratings/rating-aggregate.repository';
import { ALL_TABLE_NAMES } from '../src/db/schema-table-names';
import { users, products, orders, reviews, ratingAggregates } from '../src/db/schema';
import type { ProductRow } from '../src/db/schema';

const ratingAggregateRepository = new RatingAggregateRepository();

const DEMO_USERS = [
  { name: 'Marta K.', email: 'marta@demo.dev', token: 'demo-token-marta' },
  { name: 'Daniel P.', email: 'daniel@demo.dev', token: 'demo-token-daniel' },
  { name: 'Ingrid S.', email: 'ingrid@demo.dev', token: 'demo-token-ingrid' },
];

async function createProduct(
  tx: Tx,
  input: { name: string; slug: string; priceCents: number; category: string },
): Promise<ProductRow> {
  const [product] = await tx.insert(products).values(input).returning();
  await tx.insert(ratingAggregates).values({ productId: product.id });
  return product;
}

async function main(): Promise<void> {
  assertLocalDatabase(DATABASE_URL);
  console.log(`Seeding ${maskDatabaseUrl(DATABASE_URL)} — every table will be truncated first.`);

  // Roll back the reset if any seed insert fails.
  const primaryProduct = await db.transaction(async (tx) => {
    await tx.execute(sql`TRUNCATE ${sql.raw(ALL_TABLE_NAMES.join(', '))} CASCADE`);

    const insertedUsers = await tx
      .insert(users)
      .values(
        DEMO_USERS.map((u) => ({ name: u.name, email: u.email, tokenHash: hashToken(u.token) })),
      )
      .returning();

    const primary = await createProduct(tx, {
      name: 'Aurora Wireless ANC Headphones',
      slug: 'aurora-wireless-anc-headphones',
      priceCents: 17900,
      category: 'Electronics / Audio / Headphones',
    });
    await createProduct(tx, {
      name: 'Aurora Trail Running Socks',
      slug: 'aurora-trail-running-socks',
      priceCents: 1800,
      category: 'Sports / Running / Socks',
    });

    // one order per demo user for the primary product, backing "Verified Purchase"
    await tx.insert(orders).values(
      insertedUsers.map((u) => ({
        userId: u.id,
        productId: primary.id,
        purchasedAt: new Date(),
      })),
    );

    const [author] = insertedUsers;
    await tx.insert(reviews).values({
      productId: primary.id,
      userId: author.id,
      rating: 5,
      title: 'Battery life is incredible',
      body: "I've had these for three weeks now and the ANC still impresses me on every commute.",
      isVerified: true,
    });
    await ratingAggregateRepository.applyNewRating(tx, primary.id, 5);

    return primary;
  });

  console.log('Seeded (idempotent — re-run any time to reset demo data).');
  console.log('Demo user bearer tokens (fixed, also hardcoded in the frontend switcher):');
  DEMO_USERS.forEach((u) => console.log(`  ${u.name}: ${u.token}`));
  console.log(`Primary demo product slug: ${primaryProduct.slug}`);
}

main()
  .catch((err) => {
    console.error('Seed failed', err);
    process.exitCode = 1;
  })
  .finally(() => queryClient.end());
