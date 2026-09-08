import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ReviewService } from './review.service';
import type { ReviewListResult } from './review.service';
import { listReviewsQuerySchema } from './dto/list-reviews-query.dto';
import type { ListReviewsQueryDto } from './dto/list-reviews-query.dto';

// Keep public read routes separate from authenticated review mutations.
@Controller('products/:productId/reviews')
export class ProductReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  list(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query(new ZodValidationPipe(listReviewsQuerySchema)) query: ListReviewsQueryDto,
  ): Promise<ReviewListResult> {
    return this.reviewService.list(productId, query);
  }
}
