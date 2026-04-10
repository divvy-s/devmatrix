import { db, users, userProfiles, outboxEvents } from '@workspace/db';
import { eq, sql } from 'drizzle-orm';
import { NotFoundError, BusinessError } from '@workspace/errors';

const RESERVED_USERNAMES = new Set(['admin', 'api', 'support', 'help', 'system', 'root', 'null', 'undefined', 'me', 'settings', 'about']);

export class IdentityService {
  async getMe(userId: string) {
    const userArr = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!userArr[0]) throw new NotFoundError('User', userId);

    const profileArr = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
    
    return {
      id: userArr[0].id,
      username: userArr[0].username,
      displayName: userArr[0].displayName,
      status: userArr[0].status,
      moderationStatus: userArr[0].moderationStatus,
      roles: userArr[0].roles,
      createdAt: userArr[0].createdAt,
      profile: profileArr[0] || null,
    };
  }

  async updateProfile(userId: string, data: { displayName?: string; bio?: string; avatarUrl?: string; websiteUrl?: string; location?: string; }) {
    return await db.transaction(async (tx) => {
      if (data.displayName !== undefined) {
        await tx.update(users)
          .set({ displayName: data.displayName, updatedAt: new Date() })
          .where(eq(users.id, userId));
      }

      const profileData: any = { updatedAt: new Date() };
      if (data.bio !== undefined) profileData.bio = data.bio;
      if (data.avatarUrl !== undefined) profileData.avatarUrl = data.avatarUrl;
      if (data.websiteUrl !== undefined) profileData.websiteUrl = data.websiteUrl;
      if (data.location !== undefined) profileData.location = data.location;

      if (Object.keys(profileData).length > 1) {
        await tx.update(userProfiles)
          .set(profileData)
          .where(eq(userProfiles.userId, userId));
      }

      await tx.insert(outboxEvents).values({
        type: 'profile.updated',
        payload: { userId, updates: data },
        actorId: userId,
      });

      return this.getMe(userId);
    });
  }

  async checkUsername(username: string) {
    if (username.length < 3 || username.length > 20) {
      return { available: false, username };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username) || username.startsWith('_') || username.endsWith('_')) {
      return { available: false, username };
    }
    if (RESERVED_USERNAMES.has(username.toLowerCase())) {
      return { available: false, username };
    }

    const existingArr = await db.select({ id: users.id })
      .from(users)
      .where(sql`LOWER(${users.username}) = LOWER(${username})`)
      .limit(1);

    return { available: existingArr.length === 0, username };
  }

  async getProfileByUsername(username: string, requesterUserId?: string) {
    const userArr = await db.select().from(users).where(sql`LOWER(${users.username}) = LOWER(${username})`).limit(1);
    const user = userArr[0];

    if (!user || user.status === 'deleted' || user.deletedAt) {
      throw new NotFoundError('User', username);
    }

    if (user.moderationStatus === 'shadowbanned' && user.id !== requesterUserId) {
      throw new NotFoundError('User', username);
    }

    const profileArr = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      createdAt: user.createdAt,
      profile: profileArr[0] || null,
    };
  }
}
