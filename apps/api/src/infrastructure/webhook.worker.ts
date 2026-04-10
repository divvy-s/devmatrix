import { Worker, Job } from 'bullmq';
import { redisConnection } from '@workspace/queue';
import { db, webhookDeliveries, webhookSubscriptions } from '@workspace/db';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { createLogger } from '@workspace/logger';

const logger = createLogger('webhook-worker');

export const webhookWorker = new Worker('webhook:deliver', async (job: Job) => {
  const { deliveryId } = job.data;
  
  const delArr = await db.select().from(webhookDeliveries)
    .innerJoin(webhookSubscriptions, eq(webhookDeliveries.subscriptionId, webhookSubscriptions.id))
    .where(eq(webhookDeliveries.id, deliveryId)).limit(1);
    
  if (!delArr[0]) return;
  const delivery = delArr[0].webhook_deliveries;
  const sub = delArr[0].webhook_subscriptions;

  const payload = JSON.stringify(delivery.payload);
  const signature = crypto.createHmac('sha256', sub.secret).update(payload).digest('hex');

  try {
    const res = await fetch(sub.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-ID': delivery.id,
        'X-Event-Type': sub.eventType,
        'X-Timestamp': Math.floor(Date.now() / 1000).toString(),
        'X-Signature-256': `sha256=${signature}`
      },
      body: payload,
      signal: AbortSignal.timeout(10000)
    });

    if (res.ok) {
       await db.update(webhookDeliveries).set({
         status: 'delivered',
         deliveredAt: new Date(),
         lastHttpStatus: res.status
       }).where(eq(webhookDeliveries.id, delivery.id));
    } else {
       throw new Error(`HTTP \${res.status}`);
    }
  } catch (err: any) {
    const attempts = delivery.attempts + 1;
    if (attempts < 10) {
       const backoff = Math.pow(2, attempts) * 1000;
       await db.update(webhookDeliveries).set({
          status: 'failed',
          attempts,
          lastError: err.message,
          nextRetryAt: new Date(Date.now() + backoff)
       }).where(eq(webhookDeliveries.id, delivery.id));
    } else {
       await db.update(webhookDeliveries).set({
          status: 'dead',
          attempts,
          lastError: err.message
       }).where(eq(webhookDeliveries.id, delivery.id));
       
       // Optionally disable webhook subscription after many failures...
    }
    throw err;
  }
}, { connection: redisConnection });
