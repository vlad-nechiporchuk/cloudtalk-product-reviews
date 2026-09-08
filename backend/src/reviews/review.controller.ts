import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';
import type { AuthenticatedUser } from '../auth/bearer-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ReviewService } from './review.service';
import type { ReviewResponse } from './review.service';
import { createReviewSchema } from './dto/create-review.dto';
import type { CreateReviewDto } from './dto/create-review.dto';

@Controller('reviews')
@UseGuards(BearerAuthGuard)
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createReviewSchema)) dto: CreateReviewDto,
  ): Promise<ReviewResponse> {
    return this.reviewService.create(user.id, dto);
  }
}
