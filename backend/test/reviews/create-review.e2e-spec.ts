import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { AppModule } from '../../src/app.module';
import { db, queryClient } from '../../src/db/client';
import { reviews, reviewPhotos, ratingAggregates, orders } from '../../src/db/schema';
import { ALL_TABLE_NAMES } from '../../src/db/schema-table-names';
import { RatingAggregateRepository } from '../../src/ratings/rating-aggregate.repository';
import { makeUser, insertProduct } from '../support/seed';

// Both describe blocks below share this module's `queryClient` singleton —
// close it once, after both, not per describe (closing it after the first
// would break the second's DB access).
afterAll(() => queryClient.end());

describe('POST /reviews', () => {
  let app: INestApplication;
  let productId: string;

  beforeAll(async () => {
    await queryClient.unsafe(`TRUNCATE ${ALL_TABLE_NAMES.join(', ')} CASCADE`);

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const product = await insertProduct('Create-Review Test Product', 'create-review-test');
    productId = product.id;
  });
  afterAll(() => app.close());

  it('creates a review, updates the aggregate, and returns 201', async () => {
    const user = await makeUser();
    const res = await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        productId,
        rating: 4,
        title: 'Good',
        body: 'Solid product overall.',
        photoUrls: ['https://example.com/a.jpg'],
      })
      .expect(201);

    expect(res.body).toMatchObject({
      productId,
      userId: user.id,
      userName: user.name,
      rating: 4,
    });

    const [aggregate] = await db
      .select()
      .from(ratingAggregates)
      .where(eq(ratingAggregates.productId, productId));
    expect(aggregate.reviewCount).toBe(1);
    expect(aggregate.ratingSum).toBe(4);
    expect(aggregate.count4).toBe(1);

    const photos = await db
      .select()
      .from(reviewPhotos)
      .where(eq(reviewPhotos.reviewId, res.body.id));
    expect(photos.map((p) => p.url)).toEqual(['https://example.com/a.jpg']);
  });

  it('returns 409 on a second review by the same user for the same product', async () => {
    const user = await makeUser();
    await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ productId, rating: 5, body: 'first' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ productId, rating: 2, body: 'second' })
      .expect(409);
  });

  it('marks the review verified when the user has an order for the product', async () => {
    const user = await makeUser();
    await db.insert(orders).values({ userId: user.id, productId, purchasedAt: new Date() });
    const res = await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ productId, rating: 5, body: 'verified purchase' })
      .expect(201);
    expect(res.body.isVerified).toBe(true);
  });

  it('rejects an unauthenticated request', async () => {
    await request(app.getHttpServer())
      .post('/reviews')
      .send({ productId, rating: 5, body: 'x' })
      .expect(401);
  });

  it('rejects a rating above 5 with 400', async () => {
    const user = await makeUser();
    await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ productId, rating: 6, body: 'x' })
      .expect(400);
  });

  it('rejects a non-integer rating with 400', async () => {
    const user = await makeUser();
    await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ productId, rating: 4.5, body: 'x' })
      .expect(400);
  });

  it('rejects a body over 2000 characters with 400', async () => {
    const user = await makeUser();
    await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ productId, rating: 5, body: 'x'.repeat(2001) })
      .expect(400);
  });

  it('rejects a whitespace-only body with 400', async () => {
    const user = await makeUser();
    await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ productId, rating: 5, body: '   ' })
      .expect(400);
  });

  it('trims a padded body before storing it', async () => {
    const user = await makeUser();
    const res = await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ productId, rating: 5, body: '  Solid product.  ' })
      .expect(201);
    expect(res.body.body).toBe('Solid product.');
  });

  it('trims a whitespace-only title down to none, rather than storing blank padding', async () => {
    const user = await makeUser();
    const res = await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ productId, rating: 5, title: '   ', body: 'x' })
      .expect(201);
    expect(res.body.title).toBe('');
  });

  it('rejects a non-http(s) photo URL with 400', async () => {
    const user = await makeUser();
    await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ productId, rating: 5, body: 'x', photoUrls: ['javascript:alert(1)'] })
      .expect(400);
  });

  it('rejects more than 3 photoUrls with 400', async () => {
    const user = await makeUser();
    await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        productId,
        rating: 5,
        body: 'x',
        photoUrls: [
          'https://example.com/1.jpg',
          'https://example.com/2.jpg',
          'https://example.com/3.jpg',
          'https://example.com/4.jpg',
        ],
      })
      .expect(400);
  });

  it('rejects a review for an unknown product with 400, not 500', async () => {
    const user = await makeUser();
    const unknownProductId = '00000000-0000-0000-0000-000000000000';
    await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ productId: unknownProductId, rating: 5, body: 'should not persist' })
      .expect(400);

    const [orphan] = await db.select().from(reviews).where(eq(reviews.productId, unknownProductId));
    expect(orphan).toBeUndefined();
  });
});

describe('POST /reviews — rollback when the aggregate update fails', () => {
  let app: INestApplication;
  let productId: string;

  beforeAll(async () => {
    // A separate app instance with RatingAggregateRepository overridden to throw — this
    // is what actually exercises the transaction boundary, unlike a test that never gets
    // past the first statement. Overriding it here relies on RatingsModule exporting one
    // shared provider; if ReviewsModule declared its own copy, this override wouldn't reach it.
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(RatingAggregateRepository)
      .useValue({
        applyNewRating: async () => {
          throw new Error('simulated aggregate failure');
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const product = await insertProduct('Rollback Test Product', 'rollback-test');
    productId = product.id;
  });
  afterAll(() => app.close());

  it('leaves no review or photo rows behind when the in-transaction aggregate update throws', async () => {
    const user = await makeUser();
    const photoUrl = 'https://example.com/rollback-only.jpg';
    await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ productId, rating: 5, body: 'should not persist', photoUrls: [photoUrl] })
      .expect(500); // the injected failure is unmapped on purpose — what's asserted below is what's in the DB, not the status code

    const [orphanReview] = await db.select().from(reviews).where(eq(reviews.userId, user.id));
    expect(orphanReview).toBeUndefined();

    // Scoped by URL, not a bare select() — the sibling describe block's own
    // successful test leaves a real (correctly persisted) photo row behind
    // in this same table, which an unscoped query would pick up instead.
    const [orphanPhoto] = await db
      .select()
      .from(reviewPhotos)
      .where(eq(reviewPhotos.url, photoUrl));
    expect(orphanPhoto).toBeUndefined();

    const [aggregate] = await db
      .select()
      .from(ratingAggregates)
      .where(eq(ratingAggregates.productId, productId));
    expect(aggregate.reviewCount).toBe(0);
  });
});
