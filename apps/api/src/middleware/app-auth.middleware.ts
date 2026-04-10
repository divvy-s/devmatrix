import { FastifyRequest, FastifyReply } from 'fastify';
import { db, appTokens } from '@workspace/db';
import { eq, and, isNull, gt, or } from 'drizzle-orm';
import { UnauthorizedError, ForbiddenError } from '@workspace/errors';
import crypto from 'crypto';
import { authenticateRequest } from './auth.middleware';

export const authenticateAppToken = async (request: FastifyRequest, reply: FastifyReply) => {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('missing_token');
  }

  const token = authHeader.substring(7);

  try {
    // Try user JWT first
    await authenticateRequest(request, reply);
    (request as any).isAppToken = false;
    return;
  } catch (err) {
    // Fallthrough to App Token validation
  }

  const hash = crypto.createHash('sha256').update(token).digest('hex');

  const tokenArr = await db.select().from(appTokens).where(
    and(
      eq(appTokens.tokenHash, hash),
      isNull(appTokens.revokedAt),
      or(isNull(appTokens.expiresAt), gt(appTokens.expiresAt, new Date()))
    )
  ).limit(1);

  const appToken = tokenArr[0];
  if (!appToken) {
    throw new UnauthorizedError('invalid_token');
  }

  // Bind Contexts appropriately mimicking User identities exactly
  request.user = {
    userId: appToken.userId,
    roles: [],
    sessionId: 'app_token' as any
  };
  (request as any).appId = appToken.appId;
  (request as any).scopes = appToken.scopes;
  (request as any).isAppToken = true;

  db.update(appTokens).set({ lastUsedAt: new Date() }).where(eq(appTokens.id, appToken.id)).catch(() => {});
};

export const requireAppScope = (scope: string) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if ((request as any).isAppToken) {
      const scopes = (request as any).scopes as string[];
      if (!scopes.includes(scope)) {
        throw new ForbiddenError(`INSUFFICIENT_SCOPE: Requires ${scope}`);
      }
    }
  };
};
