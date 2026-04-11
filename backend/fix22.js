const fs = require('fs');

let devService = fs.readFileSync(
  'apps/api/src/modules/developers/developers.service.ts',
  'utf8',
);
devService = devService.replace(
  /import \{ appAnalyticsRollups[\s\S]*?import \{ createLogger \} from '@workspace\/logger';/m,
  "import { db, developers, users, appAnalyticsRollups, analyticsEvents, apps } from '@workspace/db';\nimport { eq, and, gte } from 'drizzle-orm';\nimport { NotFoundError, BusinessError } from '@workspace/errors';\nimport { createLogger } from '@workspace/logger';",
);
devService = devService.replace(/rows\.map\(r =>/g, 'rows.map((r: any) =>');
devService = devService.replace(
  /events\.forEach\(e =>/g,
  'events.forEach((e: any) =>',
);
fs.writeFileSync(
  'apps/api/src/modules/developers/developers.service.ts',
  devService,
);

let devCtrl = fs.readFileSync(
  'apps/api/src/modules/developers/developers.controller.ts',
  'utf8',
);
if (!devCtrl.includes('getAppAnalytics =')) {
  devCtrl = devCtrl.replace(
    /}\s*$/,
    `
  getAppAnalytics = async (request: FastifyRequest<{ Params: { appId: string } }>, reply: FastifyReply) => {
     const q = request.query as any;
     const result = await this.service.getAppAnalytics(request.user!.userId, request.params.appId, q.period, q.from, q.to);
     return reply.send(result);
  };

  getAppAnalyticsRealtime = async (request: FastifyRequest<{ Params: { appId: string } }>, reply: FastifyReply) => {
     const result = await this.service.getAppAnalyticsRealtime(request.user!.userId, request.params.appId);
     return reply.send(result);
  };
}
`,
  );
  fs.writeFileSync(
    'apps/api/src/modules/developers/developers.controller.ts',
    devCtrl,
  );
}

let adminService = fs.readFileSync(
  'apps/api/src/modules/admin/admin.service.ts',
  'utf8',
);
if (!adminService.includes('listFeatureFlags')) {
  adminService = adminService.replace(
    "import { db, apps, appVersions, webhookSubscriptions, appTokens, developers } from '@workspace/db';",
    "import { db, apps, appVersions, webhookSubscriptions, appTokens, developers, featureFlags } from '@workspace/db';\nimport { redisConnection } from '@workspace/queue';",
  );
  const admMethods = `
  async listFeatureFlags() {
     return await db.select().from(featureFlags).orderBy(featureFlags.createdAt);
  }

  async createFeatureFlag(name: string, data: any) {
     const existing = await db.select().from(featureFlags).where(eq(featureFlags.name, name)).limit(1);
     if (existing[0]) throw new BusinessError('Flag exists', 'DUPLICATE_FLAG');

     const fArr = await db.insert(featureFlags).values({
        name,
        description: data.description,
        enabled: data.enabled || false,
        enabledForRoles: data.enabledForRoles || [],
        enabledPercentage: data.enabledPercentage || 0
     }).returning();
     
     await redisConnection.del(\`fflag:\${name}\`);
     return fArr[0];
  }

  async updateFeatureFlag(name: string, data: any) {
     const fArr = await db.update(featureFlags).set({
         description: data.description,
         enabled: data.enabled,
         enabledForRoles: data.enabledForRoles,
         enabledPercentage: data.enabledPercentage,
         updatedAt: new Date()
     }).where(eq(featureFlags.name, name)).returning();
     
     if (!fArr[0]) throw new NotFoundError('Flag', name);
     await redisConnection.del(\`fflag:\${name}\`);
     return fArr[0];
  }
}
`;
  adminService =
    adminService.substring(0, adminService.lastIndexOf('}')) + admMethods;
  fs.writeFileSync('apps/api/src/modules/admin/admin.service.ts', adminService);
}

let adminRoutes = fs.readFileSync(
  'apps/api/src/modules/admin/admin.routes.ts',
  'utf8',
);
if (!adminRoutes.includes('/feature-flags')) {
  const admRoutesMethods = `
  app.get('/feature-flags', { preHandler: [authenticateRequest, requireRole('admin')] }, async (req, rep) => {
     return rep.send(await service.listFeatureFlags());
  });
  app.post('/feature-flags', { preHandler: [authenticateRequest, requireRole('admin')] }, async (req, rep) => {
     return rep.status(201).send(await service.createFeatureFlag((req.body as any).name, req.body));
  });
  app.patch('/feature-flags/:name', { preHandler: [authenticateRequest, requireRole('admin')] }, async (req, rep) => {
     return rep.send(await service.updateFeatureFlag((req.params as any).name, req.body));
  });
}
`;
  adminRoutes =
    adminRoutes.substring(0, adminRoutes.lastIndexOf('}')) + admRoutesMethods;
  fs.writeFileSync('apps/api/src/modules/admin/admin.routes.ts', adminRoutes);
}
console.log('Appended successfully');
