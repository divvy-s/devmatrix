import { db, developers, users } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { NotFoundError, BusinessError } from '@workspace/errors';
import { createLogger } from '@workspace/logger';

const logger = createLogger('developers-service');

export class DevelopersService {
  async register(userId: string, data: { displayName: string, websiteUrl?: string, bio?: string }) {
    return await db.transaction(async (tx) => {
      const devCheck = await tx.select().from(developers).where(eq(developers.userId, userId)).limit(1);
      if (devCheck.length > 0) {
        throw new BusinessError('Developers registry already active for this user', 'ALREADY_REGISTERED');
      }

      const devArr = await tx.insert(developers).values({
        userId,
        displayName: data.displayName,
        websiteUrl: data.websiteUrl,
        bio: data.bio
      }).returning();

      const userArr = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
      const user = userArr[0]!;
      const roles = user.roles as string[];
      if (!roles.includes('creator')) {
        await tx.update(users).set({ roles: [...roles, 'creator'] }).where(eq(users.id, userId));
      }

      return devArr[0];
    });
  }

  async getMe(userId: string) {
    const devArr = await db.select().from(developers).where(eq(developers.userId, userId)).limit(1);
    if (!devArr[0]) throw new NotFoundError('Developer', userId);
    return devArr[0];
  }

  async updateMe(userId: string, data: { displayName?: string, websiteUrl?: string, bio?: string }) {
    const devArr = await db.update(developers).set({
      ...data,
      updatedAt: new Date()
    }).where(eq(developers.userId, userId)).returning();

    if (!devArr[0]) throw new NotFoundError('Developer', userId);
    return devArr[0];
  }
}
