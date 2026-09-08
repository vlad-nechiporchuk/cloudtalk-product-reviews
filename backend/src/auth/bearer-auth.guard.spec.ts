import { createHash } from 'node:crypto';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { BearerAuthGuard, UserLookup } from './bearer-auth.guard';

const TOKEN = 'demo-token-123';
const TOKEN_HASH = createHash('sha256').update(TOKEN).digest('hex');

interface FakeRequest {
  headers: Record<string, string>;
  user?: { id: string; name: string };
}

function contextWithHeader(header?: string): ExecutionContext {
  const request: FakeRequest = { headers: header ? { authorization: header } : {} };

  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
}

describe('BearerAuthGuard', () => {
  it('rejects a missing Authorization header', async () => {
    const users: UserLookup = { findByTokenHash: jest.fn() };
    const guard = new BearerAuthGuard(users);

    await expect(guard.canActivate(contextWithHeader())).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an empty token after "Bearer "', async () => {
    const findByTokenHash = jest.fn();
    const guard = new BearerAuthGuard({ findByTokenHash });

    await expect(guard.canActivate(contextWithHeader('Bearer '))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(findByTokenHash).not.toHaveBeenCalled();
  });

  it('rejects a token with no matching user', async () => {
    const users: UserLookup = { findByTokenHash: jest.fn().mockResolvedValue(null) };
    const guard = new BearerAuthGuard(users);

    await expect(guard.canActivate(contextWithHeader('Bearer wrong'))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('attaches the user for a valid token and hashes before lookup', async () => {
    const user = { id: 'u1', name: 'Marta K.' };
    const findByTokenHash = jest.fn().mockResolvedValue(user);
    const guard = new BearerAuthGuard({ findByTokenHash });
    const context = contextWithHeader(`Bearer ${TOKEN}`);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(findByTokenHash).toHaveBeenCalledWith(TOKEN_HASH);
    expect((context.switchToHttp().getRequest() as FakeRequest).user).toEqual(user);
  });
});
