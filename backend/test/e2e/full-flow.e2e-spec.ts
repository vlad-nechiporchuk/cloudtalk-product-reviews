import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { queryClient } from '../../src/db/client';
import { ALL_TABLE_NAMES } from '../../src/db/schema-table-names';
import { makeUser, insertProduct } from '../support/seed';

afterAll(() => queryClient.end());

describe('full review flow', () => {
  let app: INestApplication;

  beforeAll(async () => {
    await queryClient.unsafe(`TRUNCATE ${ALL_TABLE_NAMES.join(', ')} CASCADE`);

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });
  afterAll(() => app.close());

  it('open product -> write review -> see updated rating -> vote helpful', async () => {
    const product = await insertProduct('Flow Product', 'flow-product');

    const before = await request(app.getHttpServer()).get(`/products/${product.id}`).expect(200);
    expect(before.body).toMatchObject({ reviewCount: 0, averageRating: null });

    const author = await makeUser();
    const created = await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${author.token}`)
      .send({ productId: product.id, rating: 5, body: 'Great end to end.' })
      .expect(201);

    const after = await request(app.getHttpServer()).get(`/products/${product.id}`).expect(200);
    expect(after.body).toMatchObject({
      reviewCount: 1,
      averageRating: 5,
      ratingCounts: [0, 0, 0, 0, 1],
    });

    const list = await request(app.getHttpServer())
      .get(`/products/${product.id}/reviews`)
      .expect(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0]).toMatchObject({ id: created.body.id, helpfulCount: 0 });

    const voter = await makeUser();
    const voted = await request(app.getHttpServer())
      .post(`/reviews/${created.body.id}/helpful`)
      .set('Authorization', `Bearer ${voter.token}`)
      .expect(200);
    expect(voted.body.helpfulCount).toBe(1);

    // The vote's effect on the read path, not just the mutation's own
    // response — every individual endpoint already has its own coverage,
    // so propagation through to a fresh list fetch is what this test
    // uniquely adds over those.
    const listAfterVote = await request(app.getHttpServer())
      .get(`/products/${product.id}/reviews`)
      .expect(200);
    expect(listAfterVote.body.items[0].helpfulCount).toBe(1);
  });
});
