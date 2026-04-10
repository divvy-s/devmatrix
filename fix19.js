const fs = require('fs');

let c = fs.readFileSync('apps/api/src/modules/feed/feed.controller.ts', 'utf8');
if (!c.includes('getDiscoveryFeed')) {
    const methods = `
  getDiscoveryFeed = async (request: FastifyRequest, reply: FastifyReply) => {
    const q = request.query as any;
    const result = await this.service.getDiscoveryFeed(request.user?.userId, q.cursor ? parseInt(q.cursor) : 0);
    return reply.send(result);
  };

  getTrendingAppsFeed = async (request: FastifyRequest, reply: FastifyReply) => {
    const q = request.query as any;
    const result = await this.service.getTrendingAppsFeed(q.cursor ? parseInt(q.cursor) : 0);
    return reply.send(result);
  };
}
`;
    // Replace last brace
    fs.writeFileSync('apps/api/src/modules/feed/feed.controller.ts', c.substring(0, c.lastIndexOf('}')) + methods);
}

let r = fs.readFileSync('apps/api/src/modules/feed/feed.routes.ts', 'utf8');
if (!r.includes('/discovery')) {
    const routes = `
  app.get('/discovery', controller.getDiscoveryFeed as any);
  app.get('/trending/apps', controller.getTrendingAppsFeed as any);
}
`;
    fs.writeFileSync('apps/api/src/modules/feed/feed.routes.ts', r.substring(0, r.lastIndexOf('}')) + routes);
}

let appTs = fs.readFileSync('apps/api/src/app.ts', 'utf8');
if (!appTs.includes('analyticsRoutes')) {
    appTs = appTs.replace("import { moderationRoutes } from './modules/moderation/moderation.routes';", "import { moderationRoutes } from './modules/moderation/moderation.routes';\nimport { analyticsRoutes } from './modules/analytics/analytics.routes';");
    appTs = appTs.replace("app.register(moderationRoutes, { prefix: '/api/v1' });", "app.register(moderationRoutes, { prefix: '/api/v1' });\n  app.register(analyticsRoutes, { prefix: '/api/v1/analytics' });");
    fs.writeFileSync('apps/api/src/app.ts', appTs);
}

let w = fs.readFileSync('apps/api/src/infrastructure/analytics.worker.ts', 'utf8');
if (!w.includes('analyticsRollupWorker')) {
   const rw = `
export const analyticsRollupWorker = new Worker('analytics:rollup', async () => {
    logger.info('Rolling up hourly app analytics natively');
    const query = sql\`
       WITH app_metrics as (
         SELECT 
             t.app_id,
             DATE_TRUNC('hour', NOW() - INTERVAL '1 hour') as period_start,
             COUNT(t.id) as api_calls
         FROM app_tokens t
         WHERE t.last_used_at >= NOW() - INTERVAL '1 hour'
         GROUP BY t.app_id
       )
       INSERT INTO app_analytics_rollups (app_id, period, period_start, api_calls, created_at)
       SELECT app_id, 'hour', period_start, api_calls, NOW() FROM app_metrics
       ON CONFLICT (app_id, period, period_start) DO UPDATE SET
          api_calls = EXCLUDED.api_calls;
    \`;
    await db.execute(query);
}, { connection: redisConnection });
`;
   fs.writeFileSync('apps/api/src/infrastructure/analytics.worker.ts', w + '\n' + rw);
}
console.log('Fixed syntax and routes mapping effectively');
