import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { AuthController } from './auth.controller';
import { authenticateRequest } from '../../middleware/auth.middleware';

export async function authRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();
  const controller = new AuthController();

  server.get(
    '/nonce',
    {
      schema: {
        querystring: z.object({
          address: z.string().min(42).max(42),
        }),
      },
    },
    controller.generateNonce as any,
  );

  server.post(
    '/wallet/verify',
    {
      schema: {
        body: z.object({
          address: z.string().min(42).max(42),
          signature: z.string().min(1),
          nonce: z.string().min(1),
        }),
      },
    },
    controller.verifyWallet as any,
  );

  server.post(
    '/refresh',
    {
      schema: {
        body: z
          .object({
            refreshToken: z.string().optional(),
          })
          .optional(),
      },
    },
    controller.refresh as any,
  );

  server.post(
    '/logout',
    {
      preHandler: [authenticateRequest],
    },
    controller.logout as any,
  );

  server.post(
    '/logout-all',
    {
      preHandler: [authenticateRequest],
    },
    controller.logoutAll as any,
  );
}
