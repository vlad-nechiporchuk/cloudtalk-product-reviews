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
  // USER_LOOKUP must be exported alongside BearerAuthGuard, not just the
  // guard itself: a class named in another module's @UseGuards() is
  // instantiated fresh in *that* module's scope, so its own constructor
  // dependencies (this token) need to be visible there too.
  exports: [BearerAuthGuard, USER_LOOKUP],
})
export class AuthModule {}
