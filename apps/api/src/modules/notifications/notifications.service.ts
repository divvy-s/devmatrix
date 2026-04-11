import {
  db,
  notifications,
  notificationPreferences,
  users,
  userProfiles,
  posts,
} from '@workspace/db';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import { NotFoundError } from '@workspace/errors';

export class NotificationsService {
  async getNotifications(userId: string, cursor?: string) {
    let cursorDate: Date | null = null;
    let cursorId: string | null = null;
    if (cursor) {
      try {
        const decoded = JSON.parse(
          Buffer.from(cursor, 'base64').toString('utf8'),
        );
        cursorDate = new Date(decoded.createdAt);
        cursorId = decoded.id;
      } catch (e) {}
    }

    const pQuery = db
      .select({
        id: notifications.id,
        type: notifications.type,
        resourceType: notifications.resourceType,
        resourceId: notifications.resourceId,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
        actorId: users.id,
        actorUsername: users.username,
        actorDisplayName: users.displayName,
        actorAvatarUrl: userProfiles.avatarUrl,
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.actorId, users.id))
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(
        and(
          eq(notifications.recipientId, userId),
          cursorDate && cursorId
            ? sql`(notifications.created_at, notifications.id) < (${cursorDate.toISOString()}, ${cursorId})`
            : undefined,
        ),
      )
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(21);

    const rows = await pQuery;
    const hasMore = rows.length === 21;
    const dataRows = hasMore ? rows.slice(0, 20) : rows;

    let nextCursor: string | null = null;
    if (dataRows.length > 0) {
      const last = dataRows[dataRows.length - 1];
      nextCursor = Buffer.from(
        JSON.stringify({ createdAt: last!.createdAt, id: last!.id }),
      ).toString('base64');
    }

    // Attach post previews
    const postIds = dataRows
      .filter((r) => r.resourceType === 'post')
      .map((r) => r.resourceId);
    const postPreviews: Record<string, string> = {};
    if (postIds.length > 0) {
      const matchedPosts = await db
        .select({ id: posts.id, content: posts.content })
        .from(posts)
        .where(sql`id = ANY(${postIds})`);
      for (const p of matchedPosts) {
        postPreviews[p.id] = p.content.substring(0, 100);
      }
    }

    const enrichedData = dataRows.map((r) => ({
      ...r,
      resourcePreview:
        r.resourceType === 'post' ? postPreviews[r.resourceId] || null : null,
    }));

    const unreadCountArr = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientId, userId),
          isNull(notifications.readAt),
        ),
      );

    return {
      data: enrichedData,
      nextCursor,
      unreadCount: unreadCountArr[0]?.count || 0,
    };
  }

  async readAll(userId: string) {
    await db.execute(
      sql`UPDATE notifications SET read_at = NOW() WHERE recipient_id = ${userId} AND read_at IS NULL`,
    );
    return { updated: true };
  }

  async readOne(notificationId: string, userId: string) {
    const result = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.recipientId, userId),
        ),
      )
      .returning({ id: notifications.id });

    if (result.length === 0)
      throw new NotFoundError('Notification', notificationId);
    return { updated: true };
  }

  async getPreferences(userId: string) {
    const arr = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);
    if (!arr[0]) {
      return {
        notifyOnFollow: true,
        notifyOnLike: true,
        notifyOnReply: true,
        notifyOnRepost: true,
        notifyOnMention: true,
      };
    }
    return arr[0];
  }

  async updatePreferences(userId: string, data: any) {
    await db
      .insert(notificationPreferences)
      .values({
        userId,
        ...data,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: notificationPreferences.userId,
        set: { ...data, updatedAt: new Date() },
      });

    return this.getPreferences(userId);
  }
}
