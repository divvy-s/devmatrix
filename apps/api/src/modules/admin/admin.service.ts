import { db, apps, appVersions, webhookSubscriptions, appTokens, developers } from '@workspace/db';
import { eq, desc } from 'drizzle-orm';
import { NotFoundError, BusinessError } from '@workspace/errors';
import crypto from 'crypto';

export class AdminAppsService {
  async approveApp(appId: string, adminUserId: string) {
    return await db.transaction(async tx => {
      const appArr = await tx.select().from(apps)
         .innerJoin(developers, eq(apps.developerId, developers.id))
         .where(eq(apps.id, appId)).limit(1);
      const app = appArr[0]?.apps;
      const dev = appArr[0]?.developers;
      if (!app || !dev) throw new NotFoundError('App', appId);
      
      if (dev.userId === adminUserId) {
         throw new BusinessError('Developers cannot approve their own apps', 'SELF_APPROVAL_FORBIDDEN');
      }

      const verArr = await tx.select().from(appVersions).where(eq(appVersions.appId, appId)).orderBy(desc(appVersions.createdAt)).limit(1);
      const ver = verArr[0];
      if (!ver) throw new BusinessError('No version to approve', 'MISSING_VERSION');

      await tx.update(appVersions).set({ status: 'approved', approvedAt: new Date() }).where(eq(appVersions.id, ver.id));
      const updatedApp = await tx.update(apps).set({ status: 'approved', currentVersionId: ver.id, updatedAt: new Date() }).where(eq(apps.id, appId)).returning();

      const manifest = (ver.manifest || {}) as any;
      if (manifest.webhookUrl && Array.isArray(manifest.events)) {
         for (const evt of manifest.events) {
            await tx.insert(webhookSubscriptions).values({
               appId,
               eventType: evt,
               webhookUrl: manifest.webhookUrl,
               secret: crypto.randomBytes(32).toString('hex'),
               active: true
            }).onConflictDoNothing();
         }
      }

      return updatedApp[0];
    });
  }

  async rejectApp(appId: string, reason: string) {
     const updated = await db.update(apps).set({ status: 'rejected', rejectedReason: reason, updatedAt: new Date() }).where(eq(apps.id, appId)).returning();
     if (!updated[0]) throw new NotFoundError('App', appId);
     return updated[0];
  }

  async suspendApp(appId: string, reason: string) {
     return await db.transaction(async tx => {
       const updated = await tx.update(apps).set({ status: 'suspended', rejectedReason: reason, updatedAt: new Date() }).where(eq(apps.id, appId)).returning();
       if (!updated[0]) throw new NotFoundError('App', appId);
       
       await tx.update(appTokens).set({ revokedAt: new Date() }).where(eq(appTokens.appId, appId));
       
       return updated[0];
     });
  }
}
