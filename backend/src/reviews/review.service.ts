import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { db } from '../db/client';
import { causeCode, FOREIGN_KEY_VIOLATION, UNIQUE_VIOLATION } from '../db/postgres-error';
import type { ReviewRow } from '../db/schema';
import { decodeCursor, encodeCursor } from './cursor';
import type { Cursor, SortMode } from './cursor';
import { ReviewRepository } from './review.repository';
import { RatingAggregateRepository } from '../ratings/rating-aggregate.repository';
import type { Rating } from '../ratings/rating-aggregate.repository';
import type { CreateReviewDto } from './dto/create-review.dto';
import type { ListReviewsQueryDto } from './dto/list-reviews-query.dto';

export interface ReviewResponse {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title: string | null;
  body: string;
  helpfulCount: number;
  isVerified: boolean;
  createdAt: Date;
}

export interface ReviewWithPhotos extends ReviewResponse {
  photoUrls: string[];
}

export interface ReviewListResult {
  items: ReviewWithPhotos[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

export interface HelpfulVoteResult {
  helpfulCount: number;
}

function toResponse(review: ReviewRow): ReviewResponse {
  return {
    id: review.id,
    productId: review.productId,
    userId: review.userId,
    rating: review.rating,
    title: review.title,
    body: review.body,
    helpfulCount: review.helpfulCount,
    isVerified: review.isVerified,
    createdAt: review.createdAt,
  };
}

function cursorFor(review: ReviewRow, sort: SortMode): Cursor {
  if (sort === 'newest') {
    return { sort: 'newest', createdAt: review.createdAt.toISOString(), id: review.id };
  }

  return {
    sort: 'highest_rated',
    rating: review.rating,
    createdAt: review.createdAt.toISOString(),
    id: review.id,
  };
}

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(
    private readonly reviews: ReviewRepository,
    private readonly ratings: RatingAggregateRepository,
  ) {}

  async create(userId: string, input: CreateReviewDto): Promise<ReviewResponse> {
    try {
      const created = await db.transaction(async (tx) => {
        const isVerified = await this.reviews.hasVerifiedPurchase(tx, userId, input.productId);
        const review = await this.reviews.insert(tx, {
          productId: input.productId,
          userId,
          rating: input.rating,
          title: input.title,
          body: input.body,
          isVerified,
        });
        await this.reviews.insertPhotos(tx, review.id, input.photoUrls);
        await this.ratings.applyNewRating(tx, input.productId, input.rating as Rating);

        return review;
      });

      return toResponse(created);
    } catch (err) {
      const code = causeCode(err);
      if (code === UNIQUE_VIOLATION) {
        throw new ConflictException('You have already reviewed this product');
      }
      if (code === FOREIGN_KEY_VIOLATION) {
        throw new BadRequestException('Unknown product');
      }
      this.logger.error(
        `Failed to create review for user ${userId}, product ${input.productId}`,
        err,
      );
      throw err;
    }
  }

  async list(productId: string, query: ListReviewsQueryDto): Promise<ReviewListResult> {
    let cursor: Cursor | undefined;
    if (query.cursor) {
      const decoded = decodeCursor(query.cursor, query.sort);
      if (!decoded) {
        throw new BadRequestException('Invalid cursor');
      }
      cursor = decoded;
    }

    const { page, photoUrls, hasNextPage } = await this.reviews.listPage({
      productId,
      sort: query.sort,
      rating: query.rating,
      verified: query.verified,
      cursor,
    });

    const items = page.map((r) => ({ ...toResponse(r), photoUrls: photoUrls.get(r.id) ?? [] }));

    const lastOfPage = hasNextPage ? page.at(-1) : undefined;
    const nextCursor = lastOfPage ? encodeCursor(cursorFor(lastOfPage, query.sort)) : null;

    return { items, nextCursor, hasNextPage };
  }

  async castHelpfulVote(reviewId: string, userId: string): Promise<HelpfulVoteResult> {
    const review = await this.reviews.findById(db, reviewId);
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    if (review.userId === userId) {
      throw new ForbiddenException("Can't vote on your own review");
    }

    try {
      return await db.transaction(async (tx) => {
        const inserted = await this.reviews.insertHelpfulVote(tx, reviewId, userId);
        if (inserted) {
          const helpfulCount = await this.reviews.incrementHelpfulCount(tx, reviewId);

          return { helpfulCount };
        }

        // Already voted — read the current count instead of incrementing
        // again, so a repeat vote is a no-op rather than double-counted.
        // Must read here, after insertHelpfulVote, not reuse the pre-check
        // above: a losing concurrent transaction's INSERT blocks on the
        // primary key until the winner commits, and only a read issued
        // after that point sees the incremented value. Non-null because
        // the review was confirmed to exist moments ago and nothing on
        // this app's write surface deletes one.
        const current = await this.reviews.findById(tx, reviewId);

        return { helpfulCount: current!.helpfulCount };
      });
    } catch (err) {
      this.logger.error(`Failed to cast helpful vote: review ${reviewId}, voter ${userId}`, err);
      throw err;
    }
  }
}
