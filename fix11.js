const fs = require('fs');

// Export webhookQueue
let queueIdx = fs.readFileSync('packages/queue/src/index.ts', 'utf8');
if (!queueIdx.includes('webhook.queue')) {
  fs.writeFileSync(
    'packages/queue/src/index.ts',
    queueIdx + "export * from './webhook.queue';\\n",
  );
}

// Update Outbox worker
let outbox = fs.readFileSync(
  'apps/api/src/infrastructure/outbox.worker.ts',
  'utf8',
);
if (!outbox.includes('webhookDeliveries')) {
  outbox = outbox.replace(
    "import { db, outboxEvents } from '@workspace/db';",
    "import { db, outboxEvents, webhookDeliveries, webhookSubscriptions, apps } from '@workspace/db';\\nimport { and } from 'drizzle-orm';\\nimport { v4 as uuidv4 } from 'uuid';\\nimport { webhookQueue } from '@workspace/queue';",
  );

  const dispatchLogic = `
  private async dispatchWebhooks(event: typeof outboxEvents.$inferSelect) {
    const subscriptions = await db.select().from(webhookSubscriptions)
      .innerJoin(apps, eq(webhookSubscriptions.appId, apps.id))
      .where(and(eq(webhookSubscriptions.eventType, event.type), eq(webhookSubscriptions.active, true), eq(apps.status, 'approved')));

    for (const row of subscriptions) {
      const deliveryId = uuidv4();
      const payloadObj = {
        id: deliveryId,
        event_type: event.type,
        event_id: event.id,
        occurred_at: event.createdAt,
        payload: event.payload
      };

      await db.insert(webhookDeliveries).values({
        id: deliveryId,
        subscriptionId: row.webhook_subscriptions.id,
        eventId: event.id,
        payload: payloadObj,
        status: 'pending'
      });

      await webhookQueue.add('webhook:deliver', { deliveryId });
    }
  }
`;

  outbox = outbox.replace('start() {', dispatchLogic + '\\n  start() {');
  outbox = outbox.replace(
    'await consumer(event.payload);\\n      } else {',
    'await consumer(event.payload);\\n      }\\n      await this.dispatchWebhooks(event);\\n      if (!consumer) {',
  );

  fs.writeFileSync('apps/api/src/infrastructure/outbox.worker.ts', outbox);
}

// Add routes
let devRoutes = fs.readFileSync(
  'apps/api/src/modules/developers/developers.routes.ts',
  'utf8',
);
if (!devRoutes.includes('WebhooksController')) {
  devRoutes = devRoutes.replace(
    "import { DevelopersController } from './developers.controller';",
    "import { DevelopersController } from './developers.controller';\\nimport { WebhooksController } from '../webhooks/webhooks.controller';",
  );
  const routeInject = `
  const webhooksCtrl = new WebhooksController();
  server.get('/me/apps/:appId/webhooks', {}, webhooksCtrl.listWebhooks as any);
  server.get('/me/apps/:appId/webhooks/:subscriptionId/deliveries', {}, webhooksCtrl.listDeliveries as any);
  server.post('/me/apps/:appId/webhooks/:subscriptionId/retry', {}, webhooksCtrl.retryDelivery as any);
`;
  devRoutes = devRoutes.replace(/}\\s*$/, routeInject + '\\n}');
  fs.writeFileSync(
    'apps/api/src/modules/developers/developers.routes.ts',
    devRoutes,
  );
}

console.log(
  'Outbox Webhook Relay updated and Webhook Developer Paths constructed!',
);
