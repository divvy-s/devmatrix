import { db, developers, users, appAnalyticsRollups, analyticsEvents, apps } from '@workspace/db';
import { eq, and, gte } from 'drizzle-orm';
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

  async getAppAnalytics(developerUserId: string, appId: string, period = 'hour', fromDate?: string, toDate?: string) {
     const devArr = await db.select().from(developers).where(eq(developers.userId, developerUserId)).limit(1);
     const dev = devArr[0];
     if (!dev) throw new BusinessError('Not developer', 'DEVELOPER_NOT_FOUND');
     const appCheck = await db.select({ id: apps.id }).from(apps).where(and(eq(apps.id, appId), eq(apps.developerId, dev.id))).limit(1);
     if (!appCheck[0]) throw new NotFoundError('App', appId);

     const from = fromDate ? new Date(fromDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
     
     const rows = await db.select().from(appAnalyticsRollups)
        .where(and(
           eq(appAnalyticsRollups.appId, appId),
           eq(appAnalyticsRollups.period, period),
           gte(appAnalyticsRollups.periodStart, from)
        )).orderBy(appAnalyticsRollups.periodStart);

     return {
        installs: rows.map((r: any) => r.installs),
        uninstalls: rows.map((r: any) => r.uninstalls),
        activeUsers: rows.map((r: any) => r.activeUsers),
        apiCalls: rows.map((r: any) => r.apiCalls),
        webhookSuccessRate: rows.map((r: any) => r.webhookDeliveries / ((r.webhookDeliveries + r.webhookFailures) || 1)),
        periods: rows.map((r: any) => r.periodStart.toISOString())
     };
  }

  async getAppAnalyticsRealtime(developerUserId: string, appId: string) {
     const devArr = await db.select().from(developers).where(eq(developers.userId, developerUserId)).limit(1);
     const dev = devArr[0];
     if (!dev) throw new BusinessError('Not developer', 'DEVELOPER_NOT_FOUND');
     const appCheck = await db.select({ id: apps.id }).from(apps).where(and(eq(apps.id, appId), eq(apps.developerId, dev.id))).limit(1);
     if (!appCheck[0]) throw new NotFoundError('App', appId);

     const fromTime = new Date(Date.now() - 60 * 60 * 1000);
     const events = await db.select({
        eventType: analyticsEvents.eventType,
        userId: analyticsEvents.userId
     }).from(analyticsEvents).where(and(
        eq(analyticsEvents.appId, appId),
        gte(analyticsEvents.createdAt, fromTime)
     ));

     const counts = {} as any;
     const uniqueUsers = new Set();
     events.forEach((e: any) => {
        counts[e.eventType] = (counts[e.eventType] || 0) + 1;
        if (e.userId) uniqueUsers.add(e.userId);
     });

     return {
        counts,
        uniqueUsers: uniqueUsers.size
     };
  }
}
