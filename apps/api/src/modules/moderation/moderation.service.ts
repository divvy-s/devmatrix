import { db, reports, moderationActions, moderationAppeals, users, outboxEvents, posts, apps } from '@workspace/db';
import { eq, and, desc } from 'drizzle-orm';
import { NotFoundError, BusinessError } from '@workspace/errors';
import { v4 as uuidv4 } from 'uuid';

export class ModerationService {
  async createReport(reporterId: string, data: { targetType: string, targetId: string, reason: string, details?: string }) {
    if (data.targetType === 'user' && data.targetId === reporterId) {
      throw new BusinessError('Cannot report yourself', 'SELF_REPORT_FORBIDDEN');
    }
    // Check existing
    const existing = await db.select().from(reports).where(
       and(
         eq(reports.reporterId, reporterId),
         eq(reports.targetType, data.targetType),
         eq(reports.targetId, data.targetId)
       )
    ).limit(1);
    if (existing[0]) {
      throw new BusinessError('Already reported this target', 'DUPLICATE_REPORT');
    }

    return await db.transaction(async tx => {
       const res = await tx.insert(reports).values({
          reporterId,
          targetType: data.targetType,
          targetId: data.targetId,
          reason: data.reason,
          details: data.details,
          status: 'pending'
       }).returning();

       await tx.insert(outboxEvents).values({
         type: 'report.created',
         payload: { reportId: res[0]!.id }
       });

       return { id: res[0]!.id, status: res[0]!.status };
    });
  }

  async getAdminQueue(cursor?: string, status = 'pending', type?: string) {
     return await db.select().from(reports).where(eq(reports.status, status)).orderBy(desc(reports.createdAt)).limit(20);
  }

  async resolveReport(reportId: string, adminId: string, data: { action: string, note: string, targetAction?: any }) {
     return await db.transaction(async tx => {
        const rep = await tx.select().from(reports).where(eq(reports.id, reportId)).limit(1);
        if (!rep[0]) throw new NotFoundError('Report', reportId);

        if (data.targetAction) {
           await tx.insert(moderationActions).values({
              adminId,
              targetType: rep[0].targetType,
              targetId: rep[0].targetId,
              action: data.targetAction.type,
              reason: data.targetAction.reason,
              note: data.note,
              expiresAt: data.targetAction.expiresAt ? new Date(data.targetAction.expiresAt) : undefined,
              reportId
           });
        }

        const updated = await tx.update(reports).set({
           status: 'resolved',
           resolvedBy: adminId,
           resolvedAt: new Date(),
           resolutionNote: data.note
        }).where(eq(reports.id, reportId)).returning();

        return updated[0];
     });
  }

  async dismissReport(reportId: string, adminId: string, note: string) {
     const updated = await db.update(reports).set({
        status: 'dismissed',
        resolvedBy: adminId,
        resolvedAt: new Date(),
        resolutionNote: note
     }).where(eq(reports.id, reportId)).returning();
     if (!updated[0]) throw new NotFoundError('Report', reportId);
     return updated[0];
  }

  async shadowbanUser(userId: string, adminId: string) {
     return await db.transaction(async tx => {
         const u = await tx.update(users).set({ moderationStatus: 'shadowbanned' }).where(eq(users.id, userId)).returning();
         if (!u[0]) throw new NotFoundError('User', userId);

         await tx.insert(moderationActions).values({
            adminId, targetType: 'user', targetId: userId, action: 'shadowban', reason: 'Admin enforced shadowban'
         });
         return u[0];
     });
  }

  async suspendUser(userId: string, adminId: string, reason: string, expiresAt?: string) {
     return await db.transaction(async tx => {
         const u = await tx.update(users).set({ status: 'suspended' }).where(eq(users.id, userId)).returning();
         if (!u[0]) throw new NotFoundError('User', userId);

         await tx.insert(moderationActions).values({
            adminId, targetType: 'user', targetId: userId, action: 'suspend', reason, 
            expiresAt: expiresAt ? new Date(expiresAt) : undefined
         });
         return u[0];
     });
  }

  async unsuspendUser(userId: string, adminId: string) {
     return await db.transaction(async tx => {
         const u = await tx.update(users).set({ status: 'active' }).where(eq(users.id, userId)).returning();
         if (!u[0]) throw new NotFoundError('User', userId);

         await tx.insert(moderationActions).values({
            adminId, targetType: 'user', targetId: userId, action: 'unsuspend', reason: 'Admin lifted suspension'
         });
         return u[0];
     });
  }

  async removePost(postId: string, adminId: string) {
     return await db.transaction(async tx => {
         const p = await tx.update(posts).set({ moderationStatus: 'removed' }).where(eq(posts.id, postId)).returning();
         if (!p[0]) throw new NotFoundError('Post', postId);

         await tx.insert(moderationActions).values({
            adminId, targetType: 'post', targetId: postId, action: 'remove', reason: 'Admin removed post'
         });
         return p[0];
     });
  }

  async restorePost(postId: string, adminId: string) {
     return await db.transaction(async tx => {
         const p = await tx.update(posts).set({ moderationStatus: 'visible' }).where(eq(posts.id, postId)).returning();
         if (!p[0]) throw new NotFoundError('Post', postId);

         await tx.insert(moderationActions).values({
            adminId, targetType: 'post', targetId: postId, action: 'restore', reason: 'Admin restored post'
         });
         return p[0];
     });
  }

  async getMyActions(userId: string) {
      return await db.select({
         id: moderationActions.id,
         action: moderationActions.action,
         reason: moderationActions.reason,
         createdAt: moderationActions.createdAt,
         expiresAt: moderationActions.expiresAt
      }).from(moderationActions).where(and(eq(moderationActions.targetId, userId), eq(moderationActions.targetType, 'user')));
  }

  async createAppeal(userId: string, actionId: string, reason: string) {
      const act = await db.select().from(moderationActions).where(eq(moderationActions.id, actionId)).limit(1);
      if (!act[0] || act[0].targetId !== userId) throw new BusinessError('Not your action', 'UNAUTHORIZED_APPEAL');

      return await db.transaction(async tx => {
          const appArr = await tx.insert(moderationAppeals).values({ userId, actionId, reason }).returning();
          await tx.insert(outboxEvents).values({ type: 'appeal.created', payload: { appealId: appArr[0]!.id } });
          return appArr[0];
      });
  }

  async getAdminAppeals(cursor?: string) {
      return await db.select().from(moderationAppeals).where(eq(moderationAppeals.status, 'pending')).orderBy(desc(moderationAppeals.createdAt)).limit(20);
  }

  async resolveAppeal(appealId: string, adminId: string, status: string, note?: string) {
      return await db.transaction(async tx => {
          const appArr = await tx.select().from(moderationAppeals).where(eq(moderationAppeals.id, appealId)).limit(1);
          if (!appArr[0]) throw new NotFoundError('Appeal', appealId);

          if (status === 'approved') {
              const act = await tx.select().from(moderationActions).where(eq(moderationActions.id, appArr[0].actionId)).limit(1);
              const action = act[0];
              if (action && action.action === 'suspend') {
                 await tx.update(users).set({ status: 'active' }).where(eq(users.id, action.targetId));
              } else if (action && action.action === 'shadowban') {
                 await tx.update(users).set({ moderationStatus: 'none' }).where(eq(users.id, action.targetId));
              } else if (action && action.action === 'remove') {
                 await tx.update(posts).set({ moderationStatus: 'visible' }).where(eq(posts.id, action.targetId));
              }
          }

          const updated = await tx.update(moderationAppeals).set({
             status, reviewedBy: adminId, reviewedAt: new Date(), responseNote: note
          }).where(eq(moderationAppeals.id, appealId)).returning();
          return updated[0];
      });
  }
}
