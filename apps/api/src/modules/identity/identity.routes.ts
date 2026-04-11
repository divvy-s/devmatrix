import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { IdentityController } from './identity.controller';
import { authenticateRequest } from '../../middleware/auth.middleware';
import { auditLog } from '../../middleware/audit.middleware';

export async function identityRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();
  const controller = new IdentityController();

  server.get(
    '/me',
    {
      preHandler: [authenticateRequest],
    },
    controller.getMe as any,
  );

  server.patch(
    '/me/profile',
    {
      preHandler: [authenticateRequest],
      onResponse: [auditLog('UPDATE_PROFILE', 'USER_PROFILE')],
      schema: {
        body: z.object({
          displayName: z.string().max(50).optional(),
          bio: z.string().max(500).optional(),
          avatarUrl: z.string().url().optional(),
          websiteUrl: z.string().url().optional(),
          location: z.string().max(100).optional(),
        }),
      },
    },
    controller.updateProfile as any,
  );

  server.post(
    '/check-username',
    {
      schema: {
        body: z.object({
          username: z.string().min(1),
        }),
      },
    },
    controller.checkUsername as any,
  );

  // We register a hook to decode user optionally if Bearer token is provided
  // without failing if it's missing (since auth is optional here)
  const optionalAuth = async (request: any, reply: any) => {
    if (request.headers.authorization?.startsWith('Bearer ')) {
      try {
        await authenticateRequest(request, reply);
      } catch (err) {
        // ignore auth error, it's optional
      }
    }
  };

  server.get(
    '/:username',
    {
      preHandler: [optionalAuth],
      schema: {
        params: z.object({
          username: z.string().min(1),
        }),
      },
    },
    controller.getProfileByUsername as any,
  );
}
