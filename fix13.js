const fs = require('fs');

let t1 = fs.readFileSync(
  'apps/api/src/infrastructure/outbox.worker.ts',
  'utf8',
);
if (!t1.includes('import { v4 as uuidv4 }')) {
  t1 = "import { and } from 'drizzle-orm';\n" + t1;
  t1 = "import { v4 as uuidv4 } from 'uuid';\n" + t1;
  t1 = "import { webhookQueue } from '@workspace/queue';\n" + t1;
  t1 = t1.replace(
    "import { db, outboxEvents } from '@workspace/db';",
    "import { db, outboxEvents, webhookDeliveries, webhookSubscriptions, apps } from '@workspace/db';",
  );
  fs.writeFileSync('apps/api/src/infrastructure/outbox.worker.ts', t1);
}

let t2 = fs.readFileSync(
  'apps/api/src/modules/webhooks/webhooks.service.ts',
  'utf8',
);
t2 = t2.replace(
  "new BusinessError('Not developer')",
  "new BusinessError('Not developer', 'DEVELOPER_NOT_FOUND')",
);
t2 = t2.replace("new NotFoundError('App')", "new NotFoundError('App', appId)");
t2 = t2.replace(
  "new NotFoundError('Delivery')",
  "new NotFoundError('Delivery', deliveryId)",
);
fs.writeFileSync('apps/api/src/modules/webhooks/webhooks.service.ts', t2);

let t3 = fs.readFileSync(
  'apps/api/src/modules/webhooks/webhooks.controller.ts',
  'utf8',
);
t3 = t3.replace(
  'request.body?.deliveryId',
  '(request.body as any)?.deliveryId',
);
fs.writeFileSync('apps/api/src/modules/webhooks/webhooks.controller.ts', t3);

let t4 = fs.readFileSync('apps/api/src/modules/admin/admin.service.ts', 'utf8');
if (!t4.includes(' developers } from')) {
  t4 = t4.replace(
    "import { db, apps, appVersions, webhookSubscriptions, appTokens } from '@workspace/db';",
    "import { db, apps, appVersions, webhookSubscriptions, appTokens, developers } from '@workspace/db';",
  );
  fs.writeFileSync('apps/api/src/modules/admin/admin.service.ts', t4);
}

console.log('Final TS resolutions integrated!');
