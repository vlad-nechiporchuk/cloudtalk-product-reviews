import { Module } from '@nestjs/common';
import { BearerAuthGuard } from './bearer-auth.guard';
import { UserRepository } from './user.repository';

@Module({
  providers: [BearerAuthGuard, UserRepository],
  exports: [BearerAuthGuard, UserRepository],
})
export class AuthModule {}
