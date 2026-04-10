import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { SocialController } from './social.controller';
import { authenticateRequest } from '../../middleware/auth.middleware';

export async function socialRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();
  const controller = new SocialController();

  const optionalAuth = async (request: any, reply: any) => {
    if (request.headers.authorization?.startsWith('Bearer ')) {
      try {
        await authenticateRequest(request, reply);
      } catch (err) {}
    }
  };

  server.post('/:username/follow', { preHandler: [authenticateRequest] }, controller.follow as any);
  server.delete('/:username/follow', { preHandler: [authenticateRequest] }, controller.unfollow as any);

  server.get(
    '/:username/followers',
    {
      preHandler: [optionalAuth],
      schema: { querystring: z.object({ cursor: z.string().optional() }) }
    },
    controller.getFollowers as any
  );

  server.get(
    '/:username/following',
    {
      preHandler: [optionalAuth],
      schema: { querystring: z.object({ cursor: z.string().optional() }) }
    },
    controller.getFollowing as any
  );

  server.post('/:username/block', { preHandler: [authenticateRequest] }, controller.block as any);
  server.delete('/:username/block', { preHandler: [authenticateRequest] }, controller.unblock as any);
  server.post('/:username/mute', { preHandler: [authenticateRequest] }, controller.mute as any);
  server.delete('/:username/mute', { preHandler: [authenticateRequest] }, controller.unmute as any);

  server.get('/me/blocks', { preHandler: [authenticateRequest] }, controller.getBlocks as any);
  server.get('/me/mutes', { preHandler: [authenticateRequest] }, controller.getMutes as any);
}
