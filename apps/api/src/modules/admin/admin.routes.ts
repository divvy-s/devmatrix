import { FastifyInstance } from 'fastify';
import { AdminAppsService } from './admin.service';
import { authenticateRequest } from '../../middleware/auth.middleware';
import { ForbiddenError } from '@workspace/errors';
import { z } from 'zod';

export async function adminRoutes(app: FastifyInstance) {
  const service = new AdminAppsService();

  app.addHook('preHandler', async (req, rep) => {
    await authenticateRequest(req, rep);
    if (!(req.user?.roles || []).includes('admin')) {
       throw new ForbiddenError('Admin required');
    }
  });

  app.post('/apps/:appId/approve', { schema: { params: z.object({ appId: z.string().uuid() }) } }, async (req, rep) => {
    return rep.send(await service.approveApp((req.params as any).appId, req.user!.userId));
  });

  app.post('/apps/:appId/reject', { schema: { params: z.object({ appId: z.string().uuid() }), body: z.object({ reason: z.string().min(1) }) } }, async (req, rep) => {
    return rep.send(await service.rejectApp((req.params as any).appId, ((req.body as any)||{}).reason));
  });

  app.post('/apps/:appId/suspend', { schema: { params: z.object({ appId: z.string().uuid() }), body: z.object({ reason: z.string().min(1) }) } }, async (req, rep) => {
    return rep.send(await service.suspendApp((req.params as any).appId, ((req.body as any)||{}).reason));
  });
}
