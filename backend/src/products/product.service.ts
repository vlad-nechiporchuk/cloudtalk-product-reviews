import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { ProductRow, RatingAggregateRow } from '../db/schema';
import { RatingAggregateRepository } from '../ratings/rating-aggregate.repository';
import { ProductRepository } from './product.repository';

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  category: string;
  reviewCount: number;
  averageRating: number | null;
  ratingCounts: [number, number, number, number, number]; // index 0 = 1-star ... index 4 = 5-star
}

function toSummary(product: ProductRow, aggregate: RatingAggregateRow | null): ProductSummary {
  const base = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    priceCents: product.priceCents,
    category: product.category,
  };

  if (!aggregate || aggregate.reviewCount === 0) {
    return { ...base, reviewCount: 0, averageRating: null, ratingCounts: [0, 0, 0, 0, 0] };
  }

  return {
    ...base,
    reviewCount: aggregate.reviewCount,
    averageRating: Number((aggregate.ratingSum / aggregate.reviewCount).toFixed(2)),
    ratingCounts: [
      aggregate.count1,
      aggregate.count2,
      aggregate.count3,
      aggregate.count4,
      aggregate.count5,
    ],
  };
}

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    private readonly products: ProductRepository,
    private readonly ratings: RatingAggregateRepository,
  ) {}

  async getSummary(idOrSlug: string): Promise<ProductSummary> {
    const product = await this.products.findBySlugOrId(idOrSlug);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const aggregate = await this.ratings.findByProductId(product.id);
    if (!aggregate) {
      // Should always exist (created transactionally with its product) —
      // surface a violation instead of looking identical to "no reviews".
      this.logger.warn(`Missing rating_aggregates row for existing product ${product.id}`);
    }

    return toSummary(product, aggregate);
  }
}
