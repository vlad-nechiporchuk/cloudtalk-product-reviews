import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { hashToken } from './hash-token';

export interface AuthenticatedUser {
  id: string;
  name: string;
}

export interface UserLookup {
  findByTokenHash(tokenHash: string): Promise<AuthenticatedUser | null>;
}

// A TypeScript interface erases at runtime and can't itself be a DI token,
// so UserLookup is provided under this token instead.
export const USER_LOOKUP = Symbol('UserLookup');

interface RequestWithUser {
  headers: { authorization?: string };
  user?: AuthenticatedUser;
}

@Injectable()
export class BearerAuthGuard implements CanActivate {
  constructor(@Inject(USER_LOOKUP) private readonly users: UserLookup) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const tokenHash = hashToken(token);
    const user = await this.users.findByTokenHash(tokenHash);
    if (!user) {
      throw new UnauthorizedException('Invalid bearer token');
    }

    request.user = user;

    return true;
  }
}
