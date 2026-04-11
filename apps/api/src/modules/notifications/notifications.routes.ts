import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { NotificationsController } from './notifications.controller';
import { authenticateRequest } from '../../middleware/auth.middleware';

export async function notificationsRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();
  const controller = new NotificationsController();

  server.addHook('preHandler', authenticateRequest);

  server.get(
    '/',
    { schema: { querystring: z.object({ cursor: z.string().optional() }) } },
    controller.getNotifications as any,
  );

  server.post('/read-all', {}, controller.readAll as any);

  server.patch(
    '/:id/read',
    { schema: { params: z.object({ id: z.string().uuid() }) } },
    controller.readOne as any,
  );

  server.get('/preferences', {}, controller.getPreferences as any);

  server.patch(
    '/preferences',
    {
      schema: {
        body: z.object({
          notifyOnFollow: z.boolean().optional(),
          notifyOnLike: z.boolean().optional(),
          notifyOnReply: z.boolean().optional(),
          notifyOnRepost: z.boolean().optional(),
          notifyOnMention: z.boolean().optional(),
        }),
      },
    },
    controller.updatePreferences as any,
  );
}
