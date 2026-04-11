import { webhookQueue } from '@workspace/queue';
import { v4 as uuidv4 } from 'uuid';
import { and } from 'drizzle-orm';
import {
  db,
  outboxEvents,
  notifications,
  notificationPreferences,
  users,
  posts,
  webhookDeliveries,
  webhookSubscriptions,
  apps,
} from '@workspace/db';
import { sql, eq } from 'drizzle-orm';
import { createLogger } from '@workspace/logger';

const logger = createLogger('outbox-worker');
const POLL_INTERVAL = process.env.OUTBOX_POLL_INTERVAL_MS
  ? parseInt(process.env.OUTBOX_POLL_INTERVAL_MS)
  : 1000;

export class OutboxWorker {
  private intervalId?: NodeJS.Timeout;
  private isProcessing = false;

  private consumers: Record<string, (payload: any) => Promise<void>> = {
    'user.followed': async (payload) => {
      const { followerId, followingId } = payload;
      const prefArr = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, followingId))
        .limit(1);
      let pref = prefArr[0];
      if (!pref) {
        await db
          .insert(notificationPreferences)
          .values({ userId: followingId })
          .onConflictDoNothing();
        pref = { notifyOnFollow: true } as any;
      }
      if (pref?.notifyOnFollow) {
        await db.insert(notifications).values({
          recipientId: followingId,
          actorId: followerId,
          type: 'follow',
          resourceType: 'user',
          resourceId: followerId,
        });
      }
    },
    'post.liked': async (payload) => {
      const { userId, postId } = payload;
      const postArr = await db
        .select({ authorId: posts.authorId })
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);
      const post = postArr[0];
      if (!post || post.authorId === userId) return;
      const prefArr = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, post.authorId))
        .limit(1);
      if (prefArr[0] === undefined || prefArr[0].notifyOnLike) {
        await db.insert(notifications).values({
          recipientId: post.authorId,
          actorId: userId,
          type: 'like',
          resourceType: 'post',
          resourceId: postId,
        });
      }
    },
    'post.created': async (payload) => {
      const { post } = payload;
      if (post.postType === 'reply') {
        const parentArr = await db
          .select({ authorId: posts.authorId })
          .from(posts)
          .where(eq(posts.id, post.parentId))
          .limit(1);
        if (parentArr[0] && parentArr[0].authorId !== post.authorId) {
          const prefArr = await db
            .select()
            .from(notificationPreferences)
            .where(eq(notificationPreferences.userId, parentArr[0].authorId))
            .limit(1);
          if (prefArr[0] === undefined || prefArr[0].notifyOnReply) {
            await db.insert(notifications).values({
              recipientId: parentArr[0].authorId,
              actorId: post.authorId,
              type: 'reply',
              resourceType: 'post',
              resourceId: post.id,
            });
          }
        }
      }
    },
    'post.reposted': async (payload) => {
      const { userId, postId } = payload;
      const postArr = await db
        .select({ authorId: posts.authorId })
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);
      if (!postArr[0] || postArr[0].authorId === userId) return;
      const prefArr = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, postArr[0].authorId))
        .limit(1);
      if (prefArr[0] === undefined || prefArr[0].notifyOnRepost) {
        await db.insert(notifications).values({
          recipientId: postArr[0].authorId,
          actorId: userId,
          type: 'repost',
          resourceType: 'post',
          resourceId: postId,
        });
      }
    },
  };

  private async dispatchWebhooks(event: typeof outboxEvents.$inferSelect) {
    const subscriptions = await db
      .select()
      .from(webhookSubscriptions)
      .innerJoin(apps, eq(webhookSubscriptions.appId, apps.id))
      .where(
        and(
          eq(webhookSubscriptions.eventType, event.type),
          eq(webhookSubscriptions.active, true),
          eq(apps.status, 'approved'),
        ),
      );

    for (const row of subscriptions) {
      const deliveryId = uuidv4();
      const payloadObj = {
        id: deliveryId,
        event_type: event.type,
        event_id: event.id,
        occurred_at: event.createdAt,
        payload: event.payload,
      };

      await db.insert(webhookDeliveries).values({
        id: deliveryId,
        subscriptionId: row.webhook_subscriptions.id,
        eventId: event.id,
        payload: payloadObj,
        status: 'pending',
      });

      await webhookQueue.add('webhook:deliver', { deliveryId });
    }
  }

  start() {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.tick(), POLL_INTERVAL);
    logger.info('OutboxWorker started');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      logger.info('OutboxWorker stopped');
    }
  }

  private async tick() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Drizzle ORM does not natively support Postgres SKIP LOCKED dynamically easily,
      // so we use execute directly
      const result = await db.execute(sql`
        SELECT * FROM outbox_events 
        WHERE status = 'pending' AND deliver_at <= NOW() 
        ORDER BY deliver_at ASC LIMIT 50
        FOR UPDATE SKIP LOCKED
      `);

      const events = result as unknown as (typeof outboxEvents.$inferSelect)[];

      for (const event of events) {
        await this.processEvent(event);
      }
    } catch (err) {
      logger.error(err, 'Outbox worker tick failed');
    } finally {
      this.isProcessing = false;
    }
  }

  private async processEvent(event: typeof outboxEvents.$inferSelect) {
    // Validate it's still pending just to be absolutely careful
    if (event.status !== 'pending' || event.deliveredAt) return;

    logger.debug({ eventId: event.id }, 'Processing outbox event');

    const backoff = (attempts: number) => {
      return Math.min(Math.pow(2, attempts), 3600);
    };

    try {
      const consumer = this.consumers[event.type];
      if (consumer) {
        await consumer(event.payload);
      } else {
        logger.warn(
          { type: event.type },
          'No consumer registered for outbox event type',
        );
      }

      await db
        .update(outboxEvents)
        .set({
          status: 'delivered',
          deliveredAt: new Date(),
        })
        .where(eq(outboxEvents.id, event.id));

      logger.debug(
        { eventId: event.id },
        'Successfully delivered outbox event',
      );
    } catch (err) {
      const newAttempts = event.attempts + 1;
      const errorMessage = err instanceof Error ? err.message : String(err);

      if (newAttempts < 10) {
        const nextDeliverAt = new Date(
          Date.now() + backoff(newAttempts) * 1000,
        );
        await db
          .update(outboxEvents)
          .set({
            attempts: newAttempts,
            lastError: errorMessage,
            deliverAt: nextDeliverAt,
          })
          .where(eq(outboxEvents.id, event.id));
      } else {
        await db
          .update(outboxEvents)
          .set({
            status: 'dead',
            attempts: newAttempts,
            lastError: errorMessage,
          })
          .where(eq(outboxEvents.id, event.id));

        logger.error({ eventId: event.id, err }, 'Outbox event dead-lettered');
      }
    }
  }
}

export const outboxWorker = new OutboxWorker();
