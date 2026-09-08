import { z } from 'zod';

export const sortModeSchema = z.enum(['newest', 'highest_rated']);
export type SortMode = z.infer<typeof sortModeSchema>;

const newestCursorSchema = z.object({
  sort: z.literal('newest'),
  createdAt: z.iso.datetime(),
  id: z.uuid(),
});

const highestRatedCursorSchema = z.object({
  sort: z.literal('highest_rated'),
  rating: z.number().int().min(1).max(5),
  createdAt: z.iso.datetime(),
  id: z.uuid(),
});

export type NewestCursor = z.infer<typeof newestCursorSchema>;
export type HighestRatedCursor = z.infer<typeof highestRatedCursorSchema>;
export type Cursor = NewestCursor | HighestRatedCursor;

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

// Validate cursor values before using them in the SQL tuple comparison.
export function decodeCursor(raw: string, expectedSort: SortMode): Cursor | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  const schema = expectedSort === 'newest' ? newestCursorSchema : highestRatedCursorSchema;
  const result = schema.safeParse(parsed);

  return result.success ? result.data : null;
}
