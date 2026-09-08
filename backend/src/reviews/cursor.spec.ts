import { encodeCursor, decodeCursor } from './cursor';

const VALID_ID = '11111111-1111-4111-8111-111111111111';

describe('cursor encode/decode', () => {
  it('round-trips a newest cursor', () => {
    const cursor = { sort: 'newest' as const, createdAt: '2026-09-08T10:00:00.000Z', id: VALID_ID };
    expect(decodeCursor(encodeCursor(cursor), 'newest')).toEqual(cursor);
  });

  it('round-trips a highest_rated cursor', () => {
    const cursor = {
      sort: 'highest_rated' as const,
      rating: 4,
      createdAt: '2026-09-08T10:00:00.000Z',
      id: VALID_ID,
    };
    expect(decodeCursor(encodeCursor(cursor), 'highest_rated')).toEqual(cursor);
  });

  it('rejects a cursor built for a different sort', () => {
    const cursor = encodeCursor({
      sort: 'newest',
      createdAt: '2026-09-08T10:00:00.000Z',
      id: VALID_ID,
    });
    expect(decodeCursor(cursor, 'highest_rated')).toBeNull();
  });

  it('rejects garbage input', () => {
    expect(decodeCursor('not-base64-json!!', 'newest')).toBeNull();
  });

  it('rejects a type-correct but semantically invalid cursor', () => {
    const badId = encodeCursor({
      sort: 'newest',
      createdAt: '2026-09-08T10:00:00.000Z',
      id: 'abc',
    });
    expect(decodeCursor(badId, 'newest')).toBeNull();

    const badDate = encodeCursor({ sort: 'newest', createdAt: 'not-a-date', id: VALID_ID });
    expect(decodeCursor(badDate, 'newest')).toBeNull();

    const badRating = encodeCursor({
      sort: 'highest_rated',
      rating: 4.5,
      createdAt: '2026-09-08T10:00:00.000Z',
      id: VALID_ID,
    });
    expect(decodeCursor(badRating, 'highest_rated')).toBeNull();
  });
});
