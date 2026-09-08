import { Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { db } from '../db/client';
import { reviews, reviewPhotos, reviewHelpfulVotes, orders } from '../db/schema';
import type { ReviewRow } from '../db/schema';
import type { Tx } from '../db/client';
import type { Cursor, SortMode } from './cursor';

export interface CreateReviewValues {
  productId: string;
  userId: string;
  rating: number;
  title?: string;
  body: string;
  isVerified: boolean;
}

export interface ListPageParams {
  productId: string;
  sort: SortMode;
  rating?: number;
  verified?: boolean;
  // Expected to already match `sort` — decodeCursor(query.cursor, query.sort)
  // enforces that one layer up, before this is ever called.
  cursor?: Cursor;
}

export interface ListPageResult {
  page: ReviewRow[];
  photoUrls: Map<string, string[]>;
  hasNextPage: boolean;
}

const PAGE_SIZE = 20;

function cursorCondition(cursor: Cursor): SQL {
  if (cursor.sort === 'newest') {
    return sql`(${reviews.createdAt}, ${reviews.id}) < (${cursor.createdAt}, ${cursor.id})`;
  }

  return sql`(${reviews.rating}, ${reviews.createdAt}, ${reviews.id}) < (${cursor.rating}, ${cursor.createdAt}, ${cursor.id})`;
}

@Injectable()
export class ReviewRepository {
  async insert(tx: Tx, values: CreateReviewValues): Promise<ReviewRow> {
    const [review] = await tx.insert(reviews).values(values).returning();

    return review;
  }

  async insertPhotos(tx: Tx, reviewId: string, urls: string[]): Promise<void> {
    if (!urls.length) {
      return;
    }

    await tx.insert(reviewPhotos).values(urls.map((url) => ({ reviewId, url })));
  }

  async hasVerifiedPurchase(tx: Tx, userId: string, productId: string): Promise<boolean> {
    const [order] = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.userId, userId), eq(orders.productId, productId)))
      .limit(1);

    return !!order;
  }

  async findById(dbOrTx: Tx | typeof db, id: string): Promise<ReviewRow | null> {
    const [row] = await dbOrTx.select().from(reviews).where(eq(reviews.id, id));

    return row ?? null;
  }

  // ON CONFLICT DO NOTHING on the (reviewId, userId) primary key, not a
  // check-then-insert — that's what makes two concurrent votes from the
  // same user resolve to exactly one insert regardless of race timing.
  async insertHelpfulVote(tx: Tx, reviewId: string, userId: string): Promise<boolean> {
    const rows = await tx
      .insert(reviewHelpfulVotes)
      .values({ reviewId, userId })
      .onConflictDoNothing({ target: [reviewHelpfulVotes.reviewId, reviewHelpfulVotes.userId] })
      .returning({ reviewId: reviewHelpfulVotes.reviewId });

    return rows.length > 0;
  }

  async incrementHelpfulCount(tx: Tx, reviewId: string): Promise<number> {
    const [row] = await tx
      .update(reviews)
      .set({ helpfulCount: sql`${reviews.helpfulCount} + 1` })
      .where(eq(reviews.id, reviewId))
      .returning({ helpfulCount: reviews.helpfulCount });

    // Only called right after insertHelpfulVote succeeded in this same
    // transaction, whose own FK on reviewId already required this row to
    // exist a statement earlier.
    return row.helpfulCount;
  }

  async listPage(params: ListPageParams): Promise<ListPageResult> {
    const conditions = [eq(reviews.productId, params.productId)];
    if (params.rating !== undefined) {
      conditions.push(eq(reviews.rating, params.rating));
    }
    if (params.verified !== undefined) {
      conditions.push(eq(reviews.isVerified, params.verified));
    }
    if (params.cursor) {
      conditions.push(cursorCondition(params.cursor));
    }

    const orderBy =
      params.sort === 'newest'
        ? [desc(reviews.createdAt), desc(reviews.id)]
        : [desc(reviews.rating), desc(reviews.createdAt), desc(reviews.id)];

    // One more row than a page holds — its presence (or absence) after the
    // slice below is what hasNextPage reports, with no separate COUNT query.
    const rows = await db
      .select()
      .from(reviews)
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(PAGE_SIZE + 1);

    const page = rows.slice(0, PAGE_SIZE);
    const hasNextPage = rows.length > PAGE_SIZE;

    const photos =
      page.length > 0
        ? await db
            .select()
            .from(reviewPhotos)
            .where(
              inArray(
                reviewPhotos.reviewId,
                page.map((r) => r.id),
              ),
            )
            .orderBy(reviewPhotos.id)
        : [];

    const photoUrls = new Map<string, string[]>();
    for (const photo of photos) {
      const urls = photoUrls.get(photo.reviewId) ?? [];
      urls.push(photo.url);
      photoUrls.set(photo.reviewId, urls);
    }

    return { page, photoUrls, hasNextPage };
  }
}
