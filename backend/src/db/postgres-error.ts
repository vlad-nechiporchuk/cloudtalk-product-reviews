export const UNIQUE_VIOLATION = '23505';
export const FOREIGN_KEY_VIOLATION = '23503';
export const CHECK_VIOLATION = '23514';

// drizzle-orm wraps the driver error: `error.message` is just "Failed
// query: <sql>", not the underlying Postgres error. The SQLSTATE code is
// on `error.cause`.
export function causeCode(err: unknown): string | undefined {
  return (err as { cause?: { code?: string } }).cause?.code;
}
