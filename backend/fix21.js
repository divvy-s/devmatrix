const fs = require('fs');

let adminService = fs.readFileSync(
  'apps/api/src/modules/admin/admin.service.ts',
  'utf8',
);
if (!adminService.includes('featureFlags')) {
  adminService = adminService.replace(
    "import { db, apps, appVersions, webhookSubscriptions, appTokens, developers } from '@workspace/db';",
    "import { db, apps, appVersions, webhookSubscriptions, appTokens, developers, featureFlags } from '@workspace/db';\nimport { redisConnection } from '@workspace/queue';",
  );
  const methods = `
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
    adminService.substring(0, adminService.lastIndexOf('}')) + methods;
  fs.writeFileSync('apps/api/src/modules/admin/admin.service.ts', adminService);
}

let adminCtrl = fs.readFileSync(
  'apps/api/src/modules/admin/admin.controller.ts',
  'utf8',
);
if (!adminCtrl.includes('listFeatureFlags')) {
  const ctrlMethods = `
  listFeatureFlags = async (request: FastifyRequest, reply: FastifyReply) => {
     const result = await this.service.listFeatureFlags();
     return reply.send(result);
  };

  createFeatureFlag = async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
     const result = await this.service.createFeatureFlag((request.body as any).name, request.body);
     return reply.status(201).send(result);
  };

  updateFeatureFlag = async (request: FastifyRequest<{ Params: { name: string }, Body: any }>, reply: FastifyReply) => {
     const result = await this.service.updateFeatureFlag(request.params.name, request.body);
     return reply.send(result);
  };
}
`;
  adminCtrl = adminCtrl.substring(0, adminCtrl.lastIndexOf('}')) + ctrlMethods;
  fs.writeFileSync('apps/api/src/modules/admin/admin.controller.ts', adminCtrl);
}

let adminRoutes = fs.readFileSync(
  'apps/api/src/modules/admin/admin.routes.ts',
  'utf8',
);
if (!adminRoutes.includes('/feature-flags')) {
  const routeMethods = `
  app.get('/feature-flags', { preHandler: [authenticateRequest, requireRole('admin')] }, controller.listFeatureFlags as any);
  app.post('/feature-flags', { preHandler: [authenticateRequest, requireRole('admin')] }, controller.createFeatureFlag as any);
  app.patch('/feature-flags/:name', { preHandler: [authenticateRequest, requireRole('admin')] }, controller.updateFeatureFlag as any);
}
`;
  adminRoutes =
    adminRoutes.substring(0, adminRoutes.lastIndexOf('}')) + routeMethods;
  fs.writeFileSync('apps/api/src/modules/admin/admin.routes.ts', adminRoutes);
}
console.log('Appended feature flags configurations accurately!');
