import crypto from 'crypto';
import { ethers } from 'ethers';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
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
import { eq, and, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const APP_NAME = 'Web3Social';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

export class AuthService {
  private parseRefreshToken(
    refreshToken: string,
  ): { familyId: string; secret: string } | null {
    const i = refreshToken.indexOf('|');
    if (i <= 0 || i >= refreshToken.length - 1) return null;
    const familyId = refreshToken.slice(0, i);
    const secret = refreshToken.slice(i + 1);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(familyId)) {
      return null;
    }
    if (!secret) return null;
    return { familyId, secret };
  }

  private async issueSession(
    userId: string,
    roles: unknown,
  ): Promise<{ accessToken: string; refreshToken: string; user: { id: string; username: string; roles: unknown } }> {
    const sessionId = uuidv4();
    const tokenFamilyId = uuidv4();
    const secret = crypto.randomBytes(32).toString('hex');
    const refreshToken = `${tokenFamilyId}|${secret}`;
    const hash = await bcrypt.hash(secret, 10);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await db.insert(sessions).values({
      id: sessionId,
      userId,
      refreshTokenHash: hash,
      tokenFamilyId,
      expiresAt,
    });

    const userArr = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const accessToken = jwt.sign(
      { sub: userId, roles, session_id: sessionId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: userId,
        username: userArr[0]?.username ?? '',
        roles,
      },
    };
  }

  async generateNonce(
    address: string,
  ): Promise<{ nonce: string; message: string }> {
    const normalized = address.toLowerCase();

    if (!/^0x[a-f0-9]{40}$/i.test(normalized)) {
      throw new UnauthorizedError('INVALID_ADDRESS');
    }

    const nonce = crypto.randomBytes(32).toString('hex');
    const isoTimestamp = new Date().toISOString();
    const message = `Sign in to ${APP_NAME}\n\nNonce: ${nonce}\nIssued at: ${isoTimestamp}\n\nThis request will expire in 5 minutes.`;

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
      throw new UnauthorizedError('NONCE_MISMATCH');
    }

    await redisConnection.del(`nonce:${normalized}`);

    const recoveredAddress = ethers.verifyMessage(stored.message, signature);

    if (recoveredAddress.toLowerCase() !== normalized) {
      throw new UnauthorizedError('INVALID_SIGNATURE');
    }

    let finalUserId: string;
    let finalRoles: unknown;
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
          chainId: 1,
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

    return this.issueSession(finalUserId!, finalRoles!);
  }

  async verifyGitHub(githubAccessToken: string) {
    const ghRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'DevMatrix-API/1.0',
      },
    });

    if (!ghRes.ok) {
      throw new UnauthorizedError('INVALID_GITHUB_TOKEN');
    }

    const ghUser = (await ghRes.json()) as {
      id: number;
      login: string;
      name: string | null;
      avatar_url: string;
      email: string | null;
    };

    const githubId = String(ghUser.id);

    let finalUserId: string;
    let finalRoles: unknown;
    let finalUsername: string;

    await db.transaction(async (tx) => {
      const existingIdentityArr = await tx
        .select()
        .from(externalIdentities)
        .where(
          and(
            eq(externalIdentities.provider, 'github'),
            eq(externalIdentities.providerId, githubId),
          ),
        )
        .limit(1);
      const existingIdentity = existingIdentityArr[0];

      if (existingIdentity) {
        finalUserId = existingIdentity.userId;
        const userArr = await tx
          .select()
          .from(users)
          .where(eq(users.id, finalUserId))
          .limit(1);
        finalUsername = userArr[0]?.username ?? ghUser.login;
        finalRoles = userArr[0]?.roles;
      } else {
        const base =
          ghUser.login || `gh_${crypto.randomBytes(4).toString('hex')}`;
        finalUserId = uuidv4();
        finalUsername = base;

        let attempt = 0;
        while (attempt < 10) {
          const clash = await tx
            .select({ id: users.id })
            .from(users)
            .where(eq(users.username, finalUsername))
            .limit(1);
          if (!clash[0]) break;
          finalUsername = `${base}_${crypto.randomBytes(2).toString('hex')}`;
          attempt++;
        }

        await tx.insert(users).values({
          id: finalUserId,
          username: finalUsername,
          displayName: ghUser.name || finalUsername,
          roles: ['user'],
        });

        await tx.insert(userProfiles).values({
          userId: finalUserId,
          avatarUrl: ghUser.avatar_url,
        });

        await tx.insert(externalIdentities).values({
          userId: finalUserId,
          provider: 'github',
          providerId: githubId,
          verifiedAt: new Date(),
        });

        await tx.insert(outboxEvents).values({
          type: 'user.created',
          payload: {
            userId: finalUserId,
            username: finalUsername,
            provider: 'github',
          },
        });

        finalRoles = ['user'];
      }
    });

    return this.issueSession(finalUserId!, finalRoles!);
  }

  async verifyGoogle(idToken: string) {
    if (!GOOGLE_CLIENT_ID) {
      throw new UnauthorizedError('GOOGLE_AUTH_NOT_CONFIGURED');
    }

    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub) {
      throw new UnauthorizedError('INVALID_GOOGLE_TOKEN');
    }

    const googleId = payload.sub;
    const email = payload.email ?? null;
    const name = payload.name ?? email ?? `user_${googleId.slice(0, 8)}`;
    const picture = payload.picture ?? null;

    let finalUserId: string;
    let finalRoles: unknown;
    let finalUsername: string;

    await db.transaction(async (tx) => {
      const existingIdentityArr = await tx
        .select()
        .from(externalIdentities)
        .where(
          and(
            eq(externalIdentities.provider, 'google'),
            eq(externalIdentities.providerId, googleId),
          ),
        )
        .limit(1);
      const existingIdentity = existingIdentityArr[0];

      if (existingIdentity) {
        finalUserId = existingIdentity.userId;
        const userArr = await tx
          .select()
          .from(users)
          .where(eq(users.id, finalUserId))
          .limit(1);
        finalUsername = userArr[0]?.username ?? name;
        finalRoles = userArr[0]?.roles;
      } else {
        const base =
          email?.split('@')[0]?.replace(/[^a-zA-Z0-9_]/g, '_') ||
          `g_${crypto.randomBytes(4).toString('hex')}`;
        finalUserId = uuidv4();
        finalUsername = base;

        let attempt = 0;
        while (attempt < 10) {
          const clash = await tx
            .select({ id: users.id })
            .from(users)
            .where(eq(users.username, finalUsername))
            .limit(1);
          if (!clash[0]) break;
          finalUsername = `${base}_${crypto.randomBytes(2).toString('hex')}`;
          attempt++;
        }

        await tx.insert(users).values({
          id: finalUserId,
          username: finalUsername,
          displayName: name,
          roles: ['user'],
        });

        await tx.insert(userProfiles).values({
          userId: finalUserId,
          avatarUrl: picture,
        });

        await tx.insert(externalIdentities).values({
          userId: finalUserId,
          provider: 'google',
          providerId: googleId,
          verifiedAt: new Date(),
        });

        await tx.insert(outboxEvents).values({
          type: 'user.created',
          payload: {
            userId: finalUserId,
            username: finalUsername,
            provider: 'google',
          },
        });

        finalRoles = ['user'];
      }
    });

    return this.issueSession(finalUserId!, finalRoles!);
  }

  async refresh(refreshToken: string) {
    const parsed = this.parseRefreshToken(refreshToken);
    if (!parsed) {
      throw new UnauthorizedError('INVALID_REFRESH_TOKEN');
    }

    const { familyId, secret } = parsed;

    const familySessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.tokenFamilyId, familyId));

    let matched: (typeof sessions.$inferSelect) | null = null;
    for (const s of familySessions) {
      if (await bcrypt.compare(secret, s.refreshTokenHash)) {
        matched = s;
        break;
      }
    }

    if (!matched) {
      throw new UnauthorizedError('INVALID_REFRESH_TOKEN');
    }

    if (matched.revokedAt) {
      await db
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(eq(sessions.userId, matched.userId));
      await db.insert(outboxEvents).values({
        type: 'security_event',
        payload: { userId: matched.userId, type: 'REFRESH_TOKEN_REUSE' },
      });
      throw new UnauthorizedError('INVALID_REFRESH_TOKEN');
    }

    if (new Date(matched.expiresAt) <= new Date()) {
      throw new UnauthorizedError('INVALID_REFRESH_TOKEN');
    }

    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.id, matched.id));

    const newSecret = crypto.randomBytes(32).toString('hex');
    const newRefreshToken = `${familyId}|${newSecret}`;
    const newHash = await bcrypt.hash(newSecret, 10);
    const sessionId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await db.insert(sessions).values({
      id: sessionId,
      userId: matched.userId,
      refreshTokenHash: newHash,
      tokenFamilyId: familyId,
      expiresAt,
    });

    const userArr = await db
      .select()
      .from(users)
      .where(eq(users.id, matched.userId))
      .limit(1);

    const accessToken = jwt.sign(
      {
        sub: matched.userId,
        roles: userArr[0]?.roles,
        session_id: sessionId,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions,
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
    await redisConnection.del(`session_valid:${sessionId}`);
  }

  async logoutAll(userId: string) {
    const active = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
    for (const row of active) {
      await redisConnection.del(`session_valid:${row.id}`);
    }
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.userId, userId));
  }
}
