import { Module } from '@nestjs/common';
import { RatingAggregateRepository } from './rating-aggregate.repository';

@Module({
  providers: [RatingAggregateRepository],
  exports: [RatingAggregateRepository],
})
export class RatingsModule {}
