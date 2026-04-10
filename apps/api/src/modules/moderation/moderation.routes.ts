import { FastifyInstance } from 'fastify';
import { ModerationController } from './moderation.controller';
import { authenticateRequest, requireRole } from '../../middleware/auth.middleware';

export async function moderationRoutes(app: FastifyInstance) {
  const controller = new ModerationController();

  app.post('/reports', { preHandler: [authenticateRequest] }, controller.createReport as any);

  app.get('/admin/moderation/queue', { preHandler: [authenticateRequest, requireRole('admin')] }, controller.getAdminQueue as any);
  app.post('/admin/moderation/reports/:reportId/resolve', { preHandler: [authenticateRequest, requireRole('admin')] }, controller.resolveReport as any);
  app.post('/admin/moderation/reports/:reportId/dismiss', { preHandler: [authenticateRequest, requireRole('admin')] }, controller.dismissReport as any);

  app.post('/admin/users/:userId/shadowban', { preHandler: [authenticateRequest, requireRole('admin')] }, controller.shadowbanUser as any);
  app.post('/admin/users/:userId/suspend', { preHandler: [authenticateRequest, requireRole('admin')] }, controller.suspendUser as any);
  app.post('/admin/users/:userId/unsuspend', { preHandler: [authenticateRequest, requireRole('admin')] }, controller.unsuspendUser as any);
  app.post('/admin/posts/:postId/remove', { preHandler: [authenticateRequest, requireRole('admin')] }, controller.removePost as any);
  app.post('/admin/posts/:postId/restore', { preHandler: [authenticateRequest, requireRole('admin')] }, controller.restorePost as any);

  app.get('/moderation/my-actions', { preHandler: [authenticateRequest] }, controller.getMyActions as any);
  app.post('/moderation/appeal', { preHandler: [authenticateRequest] }, controller.createAppeal as any);

  app.get('/admin/moderation/appeals', { preHandler: [authenticateRequest, requireRole('admin')] }, controller.getAdminAppeals as any);
  
  app.post('/admin/moderation/appeals/:appealId/approve', { preHandler: [authenticateRequest, requireRole('admin')] }, async (req, rep) => {
     (req.body as any) = { ...((req.body as any)||{}), status: 'approved' };
     return await controller.resolveAppeal(req as any, rep);
  });

  app.post('/admin/moderation/appeals/:appealId/deny', { preHandler: [authenticateRequest, requireRole('admin')] }, async (req, rep) => {
     (req.body as any) = { ...((req.body as any)||{}), status: 'denied' };
     return await controller.resolveAppeal(req as any, rep);
  });
}
