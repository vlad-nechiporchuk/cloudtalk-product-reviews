import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { db } from '../db/client';
import { causeCode, FOREIGN_KEY_VIOLATION, UNIQUE_VIOLATION } from '../db/postgres-error';
import type { ReviewRow } from '../db/schema';
import { ReviewRepository } from './review.repository';
import { RatingAggregateRepository } from '../ratings/rating-aggregate.repository';
import type { Rating } from '../ratings/rating-aggregate.repository';
import type { CreateReviewDto } from './dto/create-review.dto';

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
}
