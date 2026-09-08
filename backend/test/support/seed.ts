import { createHash, randomBytes } from 'node:crypto';
import { db } from '../../src/db/client';
import { users, products, reviews, ratingAggregates } from '../../src/db/schema';
import type { ProductRow, ReviewRow, UserRow } from '../../src/db/schema';

export type TestUser = UserRow & { token: string };

export async function makeUser(): Promise<TestUser> {
  const token = randomBytes(16).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const email = `user-${token}@test.dev`;
  const [user] = await db.insert(users).values({ name: 'Test User', email, tokenHash }).returning();

  return { ...user, token };
}

export interface RatingAggregateOverrides {
  reviewCount?: number;
  ratingSum?: number;
  count1?: number;
  count2?: number;
  count3?: number;
  count4?: number;
  count5?: number;
}

export interface InsertProductOptions {
  // `false` skips creating the rating_aggregates row entirely, for tests
  // that exercise that (data-integrity-violation) case on purpose.
  aggregate?: RatingAggregateOverrides | false;
}

export async function insertProduct(
  name: string,
  slug: string,
  options: InsertProductOptions = {},
): Promise<ProductRow> {
  const [product] = await db
    .insert(products)
    .values({ name, slug, priceCents: 100, category: 'test' })
    .returning();

  if (options.aggregate !== false) {
    await db.insert(ratingAggregates).values({ productId: product.id, ...options.aggregate });
  }

  return product;
}

export interface InsertReviewOptions {
  rating?: number;
  body?: string;
  isVerified?: boolean;
}

export async function insertReview(
  productId: string,
  userId: string,
  options: InsertReviewOptions = {},
): Promise<ReviewRow> {
  const [review] = await db
    .insert(reviews)
    .values({
      productId,
      userId,
      rating: options.rating ?? 5,
      body: options.body ?? 'x',
      isVerified: options.isVerified ?? false,
    })
    .returning();

  return review;
}
