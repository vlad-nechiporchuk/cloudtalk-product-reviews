import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { queryClient } from '../../src/db/client';
import { ALL_TABLE_NAMES } from '../../src/db/schema-table-names';
import { insertProduct } from '../support/seed';
import type { ProductRow } from '../../src/db/schema';

describe('GET /products/:idOrSlug', () => {
  let app: INestApplication;
  let productWithReviews: ProductRow;
  let productWithNoReviews: ProductRow;
  let productWithNoAggregateRow: ProductRow;

  beforeAll(async () => {
    await queryClient.unsafe(`TRUNCATE ${ALL_TABLE_NAMES.join(', ')} CASCADE`);

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    productWithReviews = await insertProduct('Product With Reviews', 'product-with-reviews', {
      aggregate: { reviewCount: 3, ratingSum: 13, count4: 2, count5: 1 },
    });

    productWithNoReviews = await insertProduct('Product With No Reviews', 'product-no-reviews');

    productWithNoAggregateRow = await insertProduct(
      'Product With No Aggregate Row',
      'product-no-aggregate-row',
      { aggregate: false },
    );
  });
  // NestJS doesn't know about `queryClient` — it's a plain module singleton,
  // not a DI-managed provider — so app.close() alone leaves its connection
  // pool open and Jest hanging after the run.
  afterAll(async () => {
    await app.close();
    await queryClient.end();
  });

  it('returns the product with its rating summary, by id', async () => {
    const res = await request(app.getHttpServer())
      .get(`/products/${productWithReviews.id}`)
      .expect(200);

    expect(res.body).toMatchObject({
      id: productWithReviews.id,
      slug: productWithReviews.slug,
      reviewCount: 3,
    });
    expect(res.body.averageRating).toBe(4.33);
    expect(res.body.ratingCounts).toEqual([0, 0, 0, 2, 1]); // seeded as count4: 2, count5: 1
  });

  it('returns the same product by slug', async () => {
    const res = await request(app.getHttpServer())
      .get(`/products/${productWithReviews.slug}`)
      .expect(200);

    expect(res.body.id).toBe(productWithReviews.id);
  });

  it('returns reviewCount 0 and averageRating null for a product with no reviews', async () => {
    const res = await request(app.getHttpServer())
      .get(`/products/${productWithNoReviews.id}`)
      .expect(200);

    expect(res.body).toMatchObject({ reviewCount: 0, averageRating: null });
  });

  it('returns reviewCount 0 and averageRating null when the rating_aggregates row is missing', async () => {
    const res = await request(app.getHttpServer())
      .get(`/products/${productWithNoAggregateRow.id}`)
      .expect(200);

    expect(res.body).toMatchObject({ reviewCount: 0, averageRating: null });
  });

  it('returns 404 for an unknown id', async () => {
    await request(app.getHttpServer())
      .get('/products/00000000-0000-0000-0000-000000000000')
      .expect(404);
  });

  it('returns 404 for an unknown slug', async () => {
    await request(app.getHttpServer()).get('/products/not-a-real-slug').expect(404);
  });
});
