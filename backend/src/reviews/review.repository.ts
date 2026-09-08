import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { reviews, reviewPhotos, orders } from '../db/schema';
import type { ReviewRow } from '../db/schema';
import type { Tx } from '../db/client';

export interface CreateReviewValues {
  productId: string;
  userId: string;
  rating: number;
  title?: string;
  body: string;
  isVerified: boolean;
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
}
