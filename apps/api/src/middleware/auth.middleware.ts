import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '@workspace/errors';
import { db, sessions, users } from '@workspace/db';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { redisConnection } from '@workspace/queue';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export async function authenticateRequest(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('TOKEN_MISSING');
  }

  const token = authHeader.split(' ')[1] as string;

  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      sub: string;
      roles: string[];
      session_id: string;
    };

    // Check if session exists, not revoked, not expired
    const [session] = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(
        and(
          eq(sessions.id, payload.session_id),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!session) {
      throw new UnauthorizedError('SESSION_REVOKED');
    }

    const cacheKey = `user_status:${payload.sub}`;
    let status = await redisConnection.get(cacheKey);

    if (!status) {
      const uArr = await db
        .select({ status: users.status })
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1);
      status = uArr[0]?.status || 'deleted';
      await redisConnection.setex(cacheKey, 60, status);
    }

    if (status === 'suspended') {
      throw new ForbiddenError('Account suspended');
    }
    if (status === 'deleted') {
      throw new UnauthorizedError('Account deleted');
    }

    request.user = {
      userId: payload.sub,
      roles: payload.roles,
      sessionId: payload.session_id,
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('TOKEN_EXPIRED');
    }
    throw new UnauthorizedError('TOKEN_INVALID');
  }
}

export function requireRole(role: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user || !request.user.roles.includes(role)) {
      throw new ForbiddenError(role);
    }
  };
}

// Augment Fastify Request
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string;
      roles: string[];
      sessionId: string;
    };
  }
}
