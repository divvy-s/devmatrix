import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { DevelopersController } from './developers.controller';
import { WebhooksController } from '../webhooks/webhooks.controller';
import { authenticateRequest, requireRole } from '../../middleware/auth.middleware';

export async function developersRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();
  const controller = new DevelopersController();

  server.addHook('preHandler', authenticateRequest as any);

  server.post('/register', {
    schema: {
      body: z.object({
        displayName: z.string().min(1),
        websiteUrl: z.string().url().optional(),
        bio: z.string().optional()
      })
    }
  }, controller.register as any);

  server.get('/me', {}, controller.getMe as any);

  server.patch('/me', {
    schema: {
      body: z.object({
        displayName: z.string().min(1).optional(),
        websiteUrl: z.string().url().optional(),
        bio: z.string().optional()
      })
    }
  }, controller.updateMe as any);

  app.get('/me/apps/:appId/analytics', { preHandler: [authenticateRequest, requireRole('developer')] }, controller.getAppAnalytics as any);
  app.get('/me/apps/:appId/analytics/realtime', { preHandler: [authenticateRequest, requireRole('developer')] }, controller.getAppAnalyticsRealtime as any);
}
