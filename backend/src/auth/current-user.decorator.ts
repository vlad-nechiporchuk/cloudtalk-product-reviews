import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedUser } from './bearer-auth.guard';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const { user } = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    // Only BearerAuthGuard sets request.user — a route using @CurrentUser()
    // without @UseGuards(BearerAuthGuard) would otherwise hand out
    // `undefined` typed as a guaranteed AuthenticatedUser.
    if (!user) {
      throw new UnauthorizedException('@CurrentUser() used on a route without BearerAuthGuard');
    }

    return user;
  },
);
