import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { ratingAggregates } from '../db/schema';
import type { RatingAggregateRow } from '../db/schema';
import type { Tx } from '../db/client';

export type Rating = 1 | 2 | 3 | 4 | 5;

const RATING_COUNT = {
  1: { field: 'count1', column: ratingAggregates.count1 },
  2: { field: 'count2', column: ratingAggregates.count2 },
  3: { field: 'count3', column: ratingAggregates.count3 },
  4: { field: 'count4', column: ratingAggregates.count4 },
  5: { field: 'count5', column: ratingAggregates.count5 },
} as const;

@Injectable()
export class RatingAggregateRepository {
  async findByProductId(productId: string): Promise<RatingAggregateRow | null> {
    const [row] = await db
      .select()
      .from(ratingAggregates)
      .where(eq(ratingAggregates.productId, productId));

    return row ?? null;
  }

  // An upsert, not a plain UPDATE: the row should always already exist
  // (created transactionally with its product), but a plain UPDATE would
  // silently affect zero rows if that invariant were ever violated — an
  // upsert self-heals by creating it instead.
  async applyNewRating(tx: Tx, productId: string, rating: Rating): Promise<void> {
    const { field, column } = RATING_COUNT[rating];

    await tx
      .insert(ratingAggregates)
      .values({ productId, reviewCount: 1, ratingSum: rating, [field]: 1 })
      .onConflictDoUpdate({
        target: ratingAggregates.productId,
        set: {
          reviewCount: sql`${ratingAggregates.reviewCount} + 1`,
          ratingSum: sql`${ratingAggregates.ratingSum} + ${rating}`,
          [field]: sql`${column} + 1`,
        },
      });
  }
}
