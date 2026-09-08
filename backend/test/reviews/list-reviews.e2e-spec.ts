import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { db, queryClient } from '../../src/db/client';
import { users, reviews, reviewPhotos } from '../../src/db/schema';
import { ALL_TABLE_NAMES } from '../../src/db/schema-table-names';
import { encodeCursor } from '../../src/reviews/cursor';
import { insertProduct } from '../support/seed';

interface ReviewItem {
  id: string;
  userName: string;
  rating: number;
  createdAt: string;
  isVerified: boolean;
}

describe('GET /products/:productId/reviews', () => {
  let app: INestApplication;
  let productId: string;

  function listReviews(product: string, query = '') {
    return request(app.getHttpServer()).get(`/products/${product}/reviews${query}`);
  }

  beforeAll(async () => {
    await queryClient.unsafe(`TRUNCATE ${ALL_TABLE_NAMES.join(', ')} CASCADE`);

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    productId = (await insertProduct('List Test Product', 'list-test')).id;

    const seededUsers = await db
      .insert(users)
      .values(
        Array.from({ length: 25 }, (_, i) => ({
          name: `U${i}`,
          email: `list-${i}@test.dev`,
          tokenHash: `list-hash-${i}`,
        })),
      )
      .returning();

    await db.insert(reviews).values(
      seededUsers.map((u, i) => ({
        productId,
        userId: u.id,
        rating: (i % 5) + 1,
        body: `Review body ${i}`,
        isVerified: i % 3 === 0,
        createdAt: new Date(Date.now() - i * 1000 * 60),
      })),
    );
  });
  afterAll(async () => {
    await app.close();
    await queryClient.end();
  });

  it('sorts newest first and paginates with a cursor', async () => {
    const page1 = await listReviews(productId, '?sort=newest').expect(200);
    expect(page1.body.items).toHaveLength(20);
    expect(page1.body.hasNextPage).toBe(true);
    const ids1 = page1.body.items.map((r: ReviewItem) => r.id);

    // The newest review (i=0, createdAt closest to now) was authored by the
    // 0th seeded user ("U0") — proves the join returns the actual author's
    // name for a known row, not just any non-null string.
    expect(page1.body.items[0].userName).toBe('U0');

    const page2 = await listReviews(
      productId,
      `?sort=newest&cursor=${encodeURIComponent(page1.body.nextCursor)}`,
    ).expect(200);
    const ids2 = page2.body.items.map((r: ReviewItem) => r.id);

    expect(page2.body.items).toHaveLength(5);
    expect(page2.body.hasNextPage).toBe(false);
    expect(page2.body.nextCursor).toBeNull();
    // Proves no id appears in both pages (a Set-of-sizes check alone would
    // pass even if page 2 repeated page 1 verbatim).
    expect(new Set([...ids1, ...ids2]).size).toBe(ids1.length + ids2.length);

    const allCreatedAt = [...page1.body.items, ...page2.body.items].map(
      (r: ReviewItem) => r.createdAt,
    );
    expect(allCreatedAt).toEqual([...allCreatedAt].sort().reverse());
  });

  it('sorts by highest rated and paginates that order across a cursor boundary too', async () => {
    const page1 = await listReviews(productId, '?sort=highest_rated').expect(200);
    expect(page1.body.items).toHaveLength(20);
    const ids1 = page1.body.items.map((r: ReviewItem) => r.id);
    const ratings1 = page1.body.items.map((r: ReviewItem) => r.rating);
    expect(ratings1).toEqual([...ratings1].sort((a, b) => b - a));

    const page2 = await listReviews(
      productId,
      `?sort=highest_rated&cursor=${encodeURIComponent(page1.body.nextCursor)}`,
    ).expect(200);
    const ids2 = page2.body.items.map((r: ReviewItem) => r.id);
    const ratings2 = page2.body.items.map((r: ReviewItem) => r.rating);

    expect(page2.body.items).toHaveLength(5);
    expect(page2.body.hasNextPage).toBe(false);
    expect(page2.body.nextCursor).toBeNull();
    expect(new Set([...ids1, ...ids2]).size).toBe(ids1.length + ids2.length);
    const allRatings = [...ratings1, ...ratings2];
    expect(allRatings).toEqual([...allRatings].sort((a, b) => b - a));
  });

  it('breaks ties on identical created_at using id as the secondary sort key', async () => {
    const tieProductId = (await insertProduct('Tie Test Product', 'tie-test')).id;

    const tieUsers = await db
      .insert(users)
      .values(
        Array.from({ length: 3 }, (_, i) => ({
          name: `Tie${i}`,
          email: `tie-${i}@test.dev`,
          tokenHash: `tie-hash-${i}`,
        })),
      )
      .returning();
    const sharedTimestamp = new Date('2026-01-01T00:00:00.000Z');
    await db.insert(reviews).values(
      tieUsers.map((u, i) => ({
        productId: tieProductId,
        userId: u.id,
        rating: 5,
        body: `Tie review ${i}`,
        isVerified: false,
        createdAt: sharedTimestamp,
      })),
    );

    const res = await listReviews(tieProductId, '?sort=newest').expect(200);
    expect(res.body.items).toHaveLength(3);
    const ids: string[] = res.body.items.map((r: ReviewItem) => r.id);
    expect(ids).toEqual([...ids].sort().reverse()); // id DESC is what breaks the tie deterministically

    // Manually build a cursor as if the middle row were the last row of a page, using the same
    // encoding the API itself returns. Proves the tuple comparison keys on id too, not just
    // created_at — a row sharing the exact boundary timestamp is neither skipped nor repeated.
    const middleCursor = encodeCursor({
      sort: 'newest',
      createdAt: sharedTimestamp.toISOString(),
      id: ids[1],
    });
    const nextPage = await listReviews(
      tieProductId,
      `?sort=newest&cursor=${encodeURIComponent(middleCursor)}`,
    ).expect(200);
    expect(nextPage.body.items.map((r: ReviewItem) => r.id)).toEqual([ids[2]]);
  });

  it('filters by verified purchase', async () => {
    const res = await listReviews(productId, '?verified=true').expect(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.every((r: ReviewItem) => r.isVerified)).toBe(true);
  });

  it('filters to unverified-only on verified=false, distinct from omitting the param', async () => {
    // A regression that collapsed "false" and "absent" into the same value
    // (they used to be, before this was fixed) would make this identical
    // to the unfiltered list instead of a strict subset of it.
    const [withFilter, withoutFilter] = await Promise.all([
      listReviews(productId, '?verified=false').expect(200),
      listReviews(productId).expect(200),
    ]);
    expect(withFilter.body.items.length).toBeGreaterThan(0);
    expect(withFilter.body.items.every((r: ReviewItem) => !r.isVerified)).toBe(true);
    expect(withFilter.body.items.length).toBeLessThan(withoutFilter.body.items.length);
  });

  it('filters by exact rating', async () => {
    const res = await listReviews(productId, '?rating=5').expect(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.every((r: ReviewItem) => r.rating === 5)).toBe(true);
  });

  it('combines rating and verified filters', async () => {
    const res = await listReviews(productId, '?rating=5&verified=true').expect(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.every((r: ReviewItem) => r.rating === 5 && r.isVerified)).toBe(true);
  });

  it('returns an empty page for a product with no reviews', async () => {
    const emptyProductId = (await insertProduct('Empty Test Product', 'empty-test')).id;
    const res = await listReviews(emptyProductId).expect(200);
    expect(res.body).toEqual({ items: [], nextCursor: null, hasNextPage: false });
  });

  it('lists photoUrls for a review that has photos', async () => {
    const photoProductId = (await insertProduct('Photo Test Product', 'photo-test')).id;
    const [photoUser] = await db
      .insert(users)
      .values({ name: 'Photo Author', email: 'photo-author@test.dev', tokenHash: 'photo-hash' })
      .returning();
    const [review] = await db
      .insert(reviews)
      .values({
        productId: photoProductId,
        userId: photoUser.id,
        rating: 5,
        body: 'x',
        isVerified: false,
      })
      .returning();
    await db.insert(reviewPhotos).values([
      { reviewId: review.id, url: 'https://example.com/1.jpg' },
      { reviewId: review.id, url: 'https://example.com/2.jpg' },
    ]);

    const res = await listReviews(photoProductId).expect(200);
    expect(res.body.items).toHaveLength(1);
    // Order isn't asserted: reviewPhotos has no upload-sequence column, so
    // the repository orders by id (a random uuid) purely for determinism
    // across requests, not to preserve submission order.
    expect([...res.body.items[0].photoUrls].sort()).toEqual([
      'https://example.com/1.jpg',
      'https://example.com/2.jpg',
    ]);
  });

  it('rejects an unknown sort value with 400', async () => {
    await listReviews(productId, '?sort=bogus').expect(400);
  });

  it('rejects a non-UUID productId with 400, not 500', async () => {
    await listReviews('not-a-uuid').expect(400);
  });

  it('rejects a cursor built for a different sort with 400', async () => {
    const newestPage = await listReviews(productId, '?sort=newest').expect(200);
    await listReviews(
      productId,
      `?sort=highest_rated&cursor=${encodeURIComponent(newestPage.body.nextCursor)}`,
    ).expect(400);
  });

  it('rejects a malformed cursor with 400', async () => {
    await listReviews(productId, '?cursor=not-valid-base64!!').expect(400);
  });

  it('rejects a well-formed cursor with a semantically invalid value with 400, not 500', async () => {
    const badId = encodeCursor({
      sort: 'newest',
      createdAt: '2026-09-08T10:00:00.000Z',
      id: 'not-a-uuid',
    });
    await listReviews(productId, `?cursor=${encodeURIComponent(badId)}`).expect(400);

    const badDate = encodeCursor({
      sort: 'newest',
      createdAt: 'not-a-date',
      id: '11111111-1111-4111-8111-111111111111',
    });
    await listReviews(productId, `?cursor=${encodeURIComponent(badDate)}`).expect(400);
  });
});
