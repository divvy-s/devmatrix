const fs = require('fs');

let c = fs.readFileSync('apps/api/src/modules/feed/feed.controller.ts', 'utf8');
c = c.replace(
  'this.service.getDiscoveryFeed',
  'this.feedService.getDiscoveryFeed',
);
c = c.replace(
  'this.service.getTrendingAppsFeed',
  'this.feedService.getTrendingAppsFeed',
);
fs.writeFileSync('apps/api/src/modules/feed/feed.controller.ts', c);

let devService = fs.readFileSync(
  'apps/api/src/modules/developers/developers.service.ts',
  'utf8',
);
if (!devService.includes('getAppAnalytics')) {
  devService = devService.replace(
    "import { db, developers, users } from '@workspace/db';",
    "import { db, developers, users, appAnalyticsRollups, analyticsEvents, apps } from '@workspace/db';\nimport { and, gte } from 'drizzle-orm';",
  );

  const metrics = `
  async getAppAnalytics(developerUserId: string, appId: string, period = 'hour', fromDate?: string, toDate?: string) {
     const dev = await this.getDeveloperByUserId(developerUserId);
     const appCheck = await db.select({ id: apps.id }).from(apps).where(and(eq(apps.id, appId), eq(apps.developerId, dev.id))).limit(1);
     if (!appCheck[0]) throw new NotFoundError('App', appId);

     const from = fromDate ? new Date(fromDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
     
     const rows = await db.select().from(appAnalyticsRollups)
        .where(and(
           eq(appAnalyticsRollups.appId, appId),
           eq(appAnalyticsRollups.period, period),
           gte(appAnalyticsRollups.periodStart, from)
        )).orderBy(appAnalyticsRollups.periodStart);

     return {
        installs: rows.map(r => r.installs),
        uninstalls: rows.map(r => r.uninstalls),
        activeUsers: rows.map(r => r.activeUsers),
        apiCalls: rows.map(r => r.apiCalls),
        webhookSuccessRate: rows.map(r => r.webhookDeliveries / ((r.webhookDeliveries + r.webhookFailures) || 1)),
        periods: rows.map(r => r.periodStart.toISOString())
     };
  }

  async getAppAnalyticsRealtime(developerUserId: string, appId: string) {
     const dev = await this.getDeveloperByUserId(developerUserId);
     const appCheck = await db.select({ id: apps.id }).from(apps).where(and(eq(apps.id, appId), eq(apps.developerId, dev.id))).limit(1);
     if (!appCheck[0]) throw new NotFoundError('App', appId);

     const fromTime = new Date(Date.now() - 60 * 60 * 1000);
     const events = await db.select({
        eventType: analyticsEvents.eventType,
        userId: analyticsEvents.userId
     }).from(analyticsEvents).where(and(
        eq(analyticsEvents.appId, appId),
        gte(analyticsEvents.createdAt, fromTime)
     ));

     const counts = {} as any;
     const uniqueUsers = new Set();
     events.forEach(e => {
        counts[e.eventType] = (counts[e.eventType] || 0) + 1;
        if (e.userId) uniqueUsers.add(e.userId);
     });

     return {
        counts,
        uniqueUsers: uniqueUsers.size
     };
  }
}
`;
  devService = devService.substring(0, devService.lastIndexOf('}')) + metrics;
  fs.writeFileSync(
    'apps/api/src/modules/developers/developers.service.ts',
    devService,
  );
}

let devCtrl = fs.readFileSync(
  'apps/api/src/modules/developers/developers.controller.ts',
  'utf8',
);
if (!devCtrl.includes('getAppAnalytics')) {
  const ctrlMetrics = `
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
`;
  devCtrl = devCtrl.substring(0, devCtrl.lastIndexOf('}')) + ctrlMetrics;
  fs.writeFileSync(
    'apps/api/src/modules/developers/developers.controller.ts',
    devCtrl,
  );
}

let devRoutes = fs.readFileSync(
  'apps/api/src/modules/developers/developers.routes.ts',
  'utf8',
);
if (!devRoutes.includes('/analytics')) {
  const routesMetrics = `
  app.get('/me/apps/:appId/analytics', { preHandler: [authenticateRequest, requireRole('developer')] }, controller.getAppAnalytics as any);
  app.get('/me/apps/:appId/analytics/realtime', { preHandler: [authenticateRequest, requireRole('developer')] }, controller.getAppAnalyticsRealtime as any);
}
`;
  devRoutes =
    devRoutes.substring(0, devRoutes.lastIndexOf('}')) + routesMetrics;
  fs.writeFileSync(
    'apps/api/src/modules/developers/developers.routes.ts',
    devRoutes,
  );
}
console.log('Finished compiling metrics');
