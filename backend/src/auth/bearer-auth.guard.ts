import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { hashToken } from './hash-token';
import { UserRepository } from './user.repository';

export interface AuthenticatedUser {
  id: string;
  name: string;
}

interface RequestWithUser {
  headers: { authorization?: string };
  user?: AuthenticatedUser;
}

@Injectable()
export class BearerAuthGuard implements CanActivate {
  constructor(private readonly users: UserRepository) {}

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
