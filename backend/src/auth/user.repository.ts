import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';
import type { AuthenticatedUser } from './bearer-auth.guard';

@Injectable()
export class UserRepository {
  async findByTokenHash(tokenHash: string): Promise<AuthenticatedUser | null> {
    const [user] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.tokenHash, tokenHash));

    return user ?? null;
  }
}
