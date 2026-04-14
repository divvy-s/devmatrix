import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { AppsController } from './apps.controller';
import { ConsentController } from './consent.controller';
import { authenticateRequest } from '../../middleware/auth.middleware';

export async function appsRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();
  const controller = new AppsController();

  server.post(
    '/',
    { preHandler: [authenticateRequest] },
    controller.createApp as any,
  );

  server.post(
    '/:slug/versions',
    { preHandler: [authenticateRequest] },
    controller.createVersion as any,
  );

  server.get('/', {}, controller.listApprovedApps as any);

  const optionalAuth = async (request: any, reply: any) => {
    if (request.headers.authorization?.startsWith('Bearer ')) {
      try {
        await authenticateRequest(request, reply);
      } catch {}
    }
  };

  server.get(
    '/developer/me',
    { preHandler: [authenticateRequest] },
    controller.getDeveloperApps as any,
  );

  server.get(
    '/:slug',
    { preHandler: [optionalAuth] },
    controller.getAppBySlug as any,
  );

  server.patch(
    '/:slug/versions/:versionId/rollback',
    { preHandler: [authenticateRequest] },
    controller.rollbackVersion as any,
  );

  const consentCtrl = new ConsentController();
  server.get(
    '/:slug/consent',
    { preHandler: [authenticateRequest] },
    consentCtrl.getConsentDetails as any,
  );
  server.post(
    '/:slug/install',
    { preHandler: [authenticateRequest] },
    consentCtrl.installApp as any,
  );
  server.delete(
    '/:slug/install',
    { preHandler: [authenticateRequest] },
    consentCtrl.uninstallApp as any,
  );
  server.post(
    '/:slug/permissions/revoke',
    { preHandler: [authenticateRequest] },
    consentCtrl.revokePermissions as any,
  );
}
