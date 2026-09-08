import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  integer,
  smallint,
  bigint,
  boolean,
  timestamp,
  primaryKey,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  tokenHash: text('token_hash').notNull().unique(),
});

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  priceCents: integer('price_cents').notNull(),
  category: text('category').notNull(),
});

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    purchasedAt: timestamp('purchased_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('orders_user_product_idx').on(t.userId, t.productId)],
);

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    rating: smallint('rating').notNull(),
    title: text('title'),
    body: text('body').notNull(),
    helpfulCount: integer('helpful_count').notNull().default(0),
    isVerified: boolean('is_verified').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
  },
  (t) => [
    check('reviews_rating_range', sql`${t.rating} BETWEEN 1 AND 5`),
    check('reviews_helpful_count_non_negative', sql`${t.helpfulCount} >= 0`),
    uniqueIndex('reviews_product_user_unique').on(t.productId, t.userId),
    // Match Postgres's default NULL ordering for `ORDER BY ... DESC`.
    index('reviews_product_created_idx').on(
      t.productId,
      t.createdAt.desc().nullsFirst(),
      t.id.desc().nullsFirst(),
    ),
    index('reviews_product_rating_idx').on(
      t.productId,
      t.rating.desc().nullsFirst(),
      t.createdAt.desc().nullsFirst(),
      t.id.desc().nullsFirst(),
    ),
    index('reviews_product_verified_idx')
      .on(t.productId, t.createdAt.desc().nullsFirst(), t.id.desc().nullsFirst())
      .where(sql`${t.isVerified} = true`),
  ],
);

export const reviewPhotos = pgTable(
  'review_photos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reviewId: uuid('review_id')
      .notNull()
      .references(() => reviews.id),
    url: text('url').notNull(),
  },
  (t) => [
    // PostgreSQL does not automatically index foreign-key columns.
    index('review_photos_review_id_idx').on(t.reviewId),
  ],
);

export const reviewHelpfulVotes = pgTable(
  'review_helpful_votes',
  {
    reviewId: uuid('review_id')
      .notNull()
      .references(() => reviews.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.reviewId, t.userId] })],
);

export const ratingAggregates = pgTable(
  'rating_aggregates',
  {
    productId: uuid('product_id')
      .primaryKey()
      .references(() => products.id),
    reviewCount: integer('review_count').notNull().default(0),
    ratingSum: bigint('rating_sum', { mode: 'number' }).notNull().default(0),
    count1: integer('count_1').notNull().default(0),
    count2: integer('count_2').notNull().default(0),
    count3: integer('count_3').notNull().default(0),
    count4: integer('count_4').notNull().default(0),
    count5: integer('count_5').notNull().default(0),
  },
  (t) => [
    check(
      'rating_aggregates_count_sum_matches_review_count',
      sql`${t.count1} + ${t.count2} + ${t.count3} + ${t.count4} + ${t.count5} = ${t.reviewCount}`,
    ),
    check(
      'rating_aggregates_rating_sum_matches_counts',
      sql`${t.count1} + 2 * ${t.count2} + 3 * ${t.count3} + 4 * ${t.count4} + 5 * ${t.count5} = ${t.ratingSum}`,
    ),
    // Equality constraints alone would still allow negative counters.
    check(
      'rating_aggregates_counts_non_negative',
      sql`${t.count1} >= 0 AND ${t.count2} >= 0 AND ${t.count3} >= 0 AND ${t.count4} >= 0 AND ${t.count5} >= 0`,
    ),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type ProductRow = typeof products.$inferSelect;
export type OrderRow = typeof orders.$inferSelect;
export type ReviewRow = typeof reviews.$inferSelect;
export type ReviewPhotoRow = typeof reviewPhotos.$inferSelect;
export type ReviewHelpfulVoteRow = typeof reviewHelpfulVotes.$inferSelect;
export type RatingAggregateRow = typeof ratingAggregates.$inferSelect;
