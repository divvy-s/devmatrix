import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { WalletController } from './wallet.controller';
import { authenticateRequest } from '../../middleware/auth.middleware';

export async function walletRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();
  const controller = new WalletController();

  server.get(
    '/',
    {
      preHandler: [authenticateRequest],
    },
    controller.getWallets as any
  );

  server.post(
    '/',
    {
      preHandler: [authenticateRequest],
      schema: {
        body: z.object({
          address: z.string().min(42).max(42),
          signature: z.string().min(1),
          nonce: z.string().min(1),
          chainId: z.number().int().positive(),
        }),
      },
    },
    controller.addWallet as any
  );

  server.delete(
    '/:address',
    {
      preHandler: [authenticateRequest],
      schema: {
        params: z.object({
          address: z.string().min(42).max(42),
        }),
      },
    },
    controller.deleteWallet as any
  );

  server.patch(
    '/:address/primary',
    {
      preHandler: [authenticateRequest],
      schema: {
        params: z.object({
          address: z.string().min(42).max(42),
        }),
      },
    },
    controller.setPrimaryWallet as any
  );
}
