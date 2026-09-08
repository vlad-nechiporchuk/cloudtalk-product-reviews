import { createHash } from 'node:crypto';

// Shared by the seed script (hashing a demo token to store) and the guard
// (hashing an incoming token to look up) — they must stay identical.
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
