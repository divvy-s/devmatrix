import crypto from 'crypto';
import { ethers } from 'ethers';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  db,
  users,
  userProfiles,
  walletAddresses,
  externalIdentities,
  sessions,
  outboxEvents,
} from '@workspace/db';
import { redisConnection } from '@workspace/queue';
import { UnauthorizedError } from '@workspace/errors';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'supersecretrefresh';
const APP_NAME = 'Web3Social';

export class AuthService {
  async generateNonce(
    address: string,
  ): Promise<{ nonce: string; message: string }> {
    const normalized = address.toLowerCase();

    if (!/^0x[a-f0-9]{40}$/i.test(normalized)) {
      throw new UnauthorizedError('INVALID_ADDRESS');
    }

    const nonce = crypto.randomBytes(32).toString('hex');
    const isoTimestamp = new Date().toISOString();
    const message = `Sign in to ${APP_NAME}\\n\\nNonce: ${nonce}\\nIssued at: ${isoTimestamp}\\n\\nThis request will expire in 5 minutes.`;

    // Store the full message so we can verify exactly
    await redisConnection.setex(
      `nonce:${normalized}`,
      300,
      JSON.stringify({ nonce, message }),
    );

    return { nonce, message };
  }

  async verifyWallet(address: string, signature: string, nonce: string) {
    const normalized = address.toLowerCase();

    const storedStr = await redisConnection.get(`nonce:${normalized}`);
    if (!storedStr) {
      throw new UnauthorizedError('NONCE_NOT_FOUND');
    }

    const stored = JSON.parse(storedStr);
    if (stored.nonce !== nonce) {
      throw new UnauthorizedError('NONCE_EXPIRED');
    }

    await redisConnection.del(`nonce:${normalized}`);

    // 3. Recover signer address
    const recoveredAddress = ethers.verifyMessage(stored.message, signature);

    if (recoveredAddress.toLowerCase() !== normalized) {
      throw new UnauthorizedError('INVALID_SIGNATURE');
    }

    // Begin DB transaction
    let finalUserId: string;
    let finalRoles: any;
    let finalUsername: string;

    await db.transaction(async (tx) => {
      const existingWalletArr = await tx
        .select()
        .from(walletAddresses)
        .where(eq(walletAddresses.address, normalized))
        .limit(1);
      const existingWallet = existingWalletArr[0];

      if (existingWallet) {
        finalUserId = existingWallet.userId;
        const userArr = await tx
          .select()
          .from(users)
          .where(eq(users.id, finalUserId))
          .limit(1);
        finalUsername = userArr[0]?.username ?? '';
        finalRoles = userArr[0]?.roles;
      } else {
        // Create user
        finalUserId = uuidv4();
        finalUsername = `user_${crypto.randomBytes(4).toString('hex')}`;

        await tx.insert(users).values({
          id: finalUserId,
          username: finalUsername,
          roles: ['user'],
        });

        await tx.insert(userProfiles).values({
          userId: finalUserId,
        });

        await tx.insert(walletAddresses).values({
          userId: finalUserId,
          address: normalized,
          chainId: 1, // default
          isPrimary: true,
          verifiedAt: new Date(),
        });

        await tx.insert(externalIdentities).values({
          userId: finalUserId,
          provider: 'wallet',
          providerId: normalized,
          verifiedAt: new Date(),
        });

        await tx.insert(outboxEvents).values({
          type: 'user.created',
          payload: { userId: finalUserId, username: finalUsername },
        });

        finalRoles = ['user'];
      }
    });

    const sessionId = uuidv4();
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const hash = await bcrypt.hash(refreshToken, 10);

    // expiry 30 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await db.insert(sessions).values({
      id: sessionId,
      userId: finalUserId!,
      refreshTokenHash: hash,
      expiresAt,
    });

    const accessToken = jwt.sign(
      { sub: finalUserId!, roles: finalRoles, session_id: sessionId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as any },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: finalUserId!,
        username: finalUsername!,
        roles: finalRoles,
      },
    };
  }

  async refresh(refreshToken: string) {
    const hashedSessionArr = await db
      .select()
      .from(sessions)
      .where(
        and(isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())),
      );

    // we must find a match
    let matchedSession = null;
    for (const s of hashedSessionArr) {
      if (await bcrypt.compare(refreshToken, s.refreshTokenHash)) {
        matchedSession = s;
        break;
      }
    }

    if (!matchedSession) {
      throw new UnauthorizedError('INVALID_REFRESH_TOKEN');
    }

    // Immediately set revoked_at = NOW() on the old session
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.id, matchedSession.id));

    // Note: if multiple uses handling requires checking if the session was already revoked beforehand, but our query above checked isNull.
    // If we want to check theft, we would select even revoked ones and compare.
    const allSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, matchedSession.userId));
    // simplified check for theft: if we found a match among revoked, it means replay!
    let matchingRevoked = null;
    for (const s of allSessions) {
      if (
        s.revokedAt &&
        (await bcrypt.compare(refreshToken, s.refreshTokenHash))
      ) {
        matchingRevoked = s;
        break;
      }
    }

    if (matchingRevoked) {
      // Revoke all
      await db
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(eq(sessions.userId, matchedSession.userId));
      await db.insert(outboxEvents).values({
        type: 'security_event',
        payload: { userId: matchedSession.userId, type: 'REFRESH_TOKEN_THEFT' },
      });
      throw new UnauthorizedError('INVALID_REFRESH_TOKEN');
    }

    const sessionId = uuidv4();
    const newRefreshToken = crypto.randomBytes(32).toString('hex');
    const hash = await bcrypt.hash(newRefreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await db.insert(sessions).values({
      id: sessionId,
      userId: matchedSession.userId,
      refreshTokenHash: hash,
      expiresAt,
    });

    const userArr = await db
      .select()
      .from(users)
      .where(eq(users.id, matchedSession.userId))
      .limit(1);

    const accessToken = jwt.sign(
      {
        sub: matchedSession.userId,
        roles: userArr[0]?.roles,
        session_id: sessionId,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as any },
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(sessionId: string) {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.id, sessionId));
  }

  async logoutAll(userId: string) {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.userId, userId));
  }
}
