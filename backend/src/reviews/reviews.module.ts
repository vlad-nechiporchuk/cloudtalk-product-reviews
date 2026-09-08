import { Module } from '@nestjs/common';
import { ReviewController } from './review.controller';
import { ProductReviewController } from './product-review.controller';
import { ReviewService } from './review.service';
import { ReviewRepository } from './review.repository';
import { RatingsModule } from '../ratings/ratings.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, RatingsModule],
  controllers: [ReviewController, ProductReviewController],
  providers: [ReviewService, ReviewRepository],
})
export class ReviewsModule {}
