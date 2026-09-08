export const UNIQUE_VIOLATION = '23505';
export const FOREIGN_KEY_VIOLATION = '23503';
export const CHECK_VIOLATION = '23514';

// Drizzle exposes the PostgreSQL SQLSTATE code through error.cause.
export function causeCode(err: unknown): string | undefined {
  return (err as { cause?: { code?: string } }).cause?.code;
}
