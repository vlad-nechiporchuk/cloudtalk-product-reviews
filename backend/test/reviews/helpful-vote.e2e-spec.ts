import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { and, eq } from 'drizzle-orm';
import { AppModule } from '../../src/app.module';
import { db, queryClient } from '../../src/db/client';
import { reviews, reviewHelpfulVotes } from '../../src/db/schema';
import { ALL_TABLE_NAMES } from '../../src/db/schema-table-names';
import { ReviewRepository } from '../../src/reviews/review.repository';
import { makeUser, insertProduct, insertReview } from '../support/seed';
import type { TestUser } from '../support/seed';

afterAll(() => queryClient.end());

async function helpfulCountOf(reviewId: string): Promise<number> {
  const [row] = await db.select().from(reviews).where(eq(reviews.id, reviewId));

  return row.helpfulCount;
}

async function voteCount(reviewId: string, userId: string): Promise<number> {
  const votes = await db
    .select()
    .from(reviewHelpfulVotes)
    .where(and(eq(reviewHelpfulVotes.reviewId, reviewId), eq(reviewHelpfulVotes.userId, userId)));

  return votes.length;
}

function castVote(app: INestApplication, id: string, token: string) {
  return request(app.getHttpServer())
    .post(`/reviews/${id}/helpful`)
    .set('Authorization', `Bearer ${token}`);
}

describe('POST /reviews/:id/helpful', () => {
  let app: INestApplication;
  let reviewId: string;
  let author: TestUser;

  beforeAll(async () => {
    await queryClient.unsafe(`TRUNCATE ${ALL_TABLE_NAMES.join(', ')} CASCADE`);

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const product = await insertProduct('Vote Test Product', 'vote-test');
    author = await makeUser();
    const review = await insertReview(product.id, author.id);
    reviewId = review.id;
  });
  afterAll(() => app.close());

  it('increments the count on first vote', async () => {
    const voter = await makeUser();
    const before = await helpfulCountOf(reviewId);
    const res = await castVote(app, reviewId, voter.token).expect(200);
    expect(res.body.helpfulCount).toBe(before + 1);
  });

  it('increments once per distinct voter, not once per review', async () => {
    // Guards the ON CONFLICT target itself: if it ever regressed from
    // (reviewId, userId) to reviewId alone, a second distinct voter's
    // first-ever vote would silently no-op instead of counting — which
    // the "idempotent repeat vote" test below can't catch, since it only
    // ever uses one voter.
    const [voterA, voterB] = await Promise.all([makeUser(), makeUser()]);
    const before = await helpfulCountOf(reviewId);

    const resA = await castVote(app, reviewId, voterA.token).expect(200);
    expect(resA.body.helpfulCount).toBe(before + 1);
    const resB = await castVote(app, reviewId, voterB.token).expect(200);
    expect(resB.body.helpfulCount).toBe(before + 2);

    expect(await voteCount(reviewId, voterA.id)).toBe(1);
    expect(await voteCount(reviewId, voterB.id)).toBe(1);
  });

  it('is idempotent on a repeat vote from the same user', async () => {
    const voter = await makeUser();
    const first = await castVote(app, reviewId, voter.token).expect(200);
    const second = await castVote(app, reviewId, voter.token).expect(200);
    // Compared against the FIRST vote's result, not a value read after
    // both calls — the latter would hold even if the repeat vote had
    // silently incremented the count again.
    expect(second.body.helpfulCount).toBe(first.body.helpfulCount);
  });

  it('blocks voting on your own review', async () => {
    await castVote(app, reviewId, author.token).expect(403);
  });

  it('returns 404 for an unknown review', async () => {
    const voter = await makeUser();
    await castVote(app, '00000000-0000-0000-0000-000000000000', voter.token).expect(404);
  });

  it('rejects a non-UUID review id with 400, not 500', async () => {
    const voter = await makeUser();
    await castVote(app, 'not-a-uuid', voter.token).expect(400);
  });

  it('rejects an unauthenticated request', async () => {
    await request(app.getHttpServer()).post(`/reviews/${reviewId}/helpful`).expect(401);
  });

  it('increments exactly once under two concurrent votes from the same user', async () => {
    const voter = await makeUser();
    const before = await helpfulCountOf(reviewId);
    const [resA, resB] = await Promise.all([
      castVote(app, reviewId, voter.token),
      castVote(app, reviewId, voter.token),
    ]);
    // Both requests see the post-increment count, not a stale read from
    // whichever one lost the race — proves there's no window where a
    // loser's response reflects a value from before the winner committed.
    expect(resA.body.helpfulCount).toBe(before + 1);
    expect(resB.body.helpfulCount).toBe(before + 1);

    expect(await helpfulCountOf(reviewId)).toBe(before + 1);
    expect(await voteCount(reviewId, voter.id)).toBe(1);
  });
});

// A real instance with one method overridden — not a hand-written mock — so
// every other method (including the real insertHelpfulVote) still runs
// against the real database; only incrementHelpfulCount fails.
class FaultyReviewRepository extends ReviewRepository {
  override async incrementHelpfulCount(): Promise<number> {
    throw new Error('simulated counter failure');
  }
}

describe('POST /reviews/:id/helpful — rollback when the counter update fails', () => {
  let app: INestApplication;
  let reviewId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ReviewRepository)
      .useValue(new FaultyReviewRepository())
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const product = await insertProduct('Vote Rollback Product', 'vote-rollback-test');
    const author = await makeUser();
    const review = await insertReview(product.id, author.id);
    reviewId = review.id;
  });
  afterAll(() => app.close());

  it('leaves no vote row behind when the helpful_count update throws', async () => {
    const voter = await makeUser();
    await castVote(app, reviewId, voter.token).expect(500); // injected failure, deliberately unmapped — the DB state below is what's under test

    expect(await voteCount(reviewId, voter.id)).toBe(0); // the real insert ran, then rolled back with the rest of the transaction
    expect(await helpfulCountOf(reviewId)).toBe(0);
  });
});
