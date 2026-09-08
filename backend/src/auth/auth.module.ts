import { Module } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';
import { BearerAuthGuard, USER_LOOKUP, UserLookup } from './bearer-auth.guard';

const drizzleUserLookup: UserLookup = {
  async findByTokenHash(tokenHash) {
    const [user] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.tokenHash, tokenHash));

    return user ?? null;
  },
};

@Module({
  providers: [BearerAuthGuard, { provide: USER_LOOKUP, useValue: drizzleUserLookup }],
  exports: [BearerAuthGuard],
})
export class AuthModule {}
