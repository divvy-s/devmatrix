import {
  db,
  webhookSubscriptions,
  webhookDeliveries,
  apps,
  developers,
} from '@workspace/db';
import { eq, and, desc } from 'drizzle-orm';
import { NotFoundError, BusinessError } from '@workspace/errors';
import { webhookQueue } from '@workspace/queue';

export class WebhooksService {
  private async verifyOwnership(userId: string, appId: string) {
    const devArr = await db
      .select()
      .from(developers)
      .where(eq(developers.userId, userId))
      .limit(1);
    if (!devArr[0])
      throw new BusinessError('Not developer', 'DEVELOPER_NOT_FOUND');

    const appArr = await db
      .select()
      .from(apps)
      .where(and(eq(apps.id, appId), eq(apps.developerId, devArr[0].id)))
      .limit(1);
    if (!appArr[0]) throw new NotFoundError('App', appId);
    return appArr[0];
  }

  async listWebhooks(userId: string, appId: string) {
    await this.verifyOwnership(userId, appId);
    return await db
      .select()
      .from(webhookSubscriptions)
      .where(eq(webhookSubscriptions.appId, appId));
  }

  async listDeliveries(userId: string, appId: string, subscriptionId: string) {
    await this.verifyOwnership(userId, appId);
    return await db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.subscriptionId, subscriptionId))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(50);
  }

  async retryDelivery(
    userId: string,
    appId: string,
    subscriptionId: string,
    deliveryId: string,
  ) {
    await this.verifyOwnership(userId, appId);

    const updated = await db
      .update(webhookDeliveries)
      .set({
        status: 'pending',
        attempts: 0,
        nextRetryAt: null,
      })
      .where(
        and(
          eq(webhookDeliveries.id, deliveryId),
          eq(webhookDeliveries.subscriptionId, subscriptionId),
        ),
      )
      .returning();

    if (!updated[0]) throw new NotFoundError('Delivery', deliveryId);

    await webhookQueue.add('webhook:deliver', { deliveryId });
    return updated[0];
  }
}
