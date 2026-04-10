import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { FeedController } from './feed.controller';
import { authenticateRequest } from '../../middleware/auth.middleware';

export async function feedRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();
  const controller = new FeedController();

  const optionalAuth = async (request: any, reply: any) => {
    if (request.headers.authorization?.startsWith('Bearer ')) {
      try {
        await authenticateRequest(request, reply);
      } catch (err) {}
    }
  };

  server.get(
    '/following',
    {
      preHandler: [authenticateRequest],
      schema: {
        querystring: z.object({ cursor: z.string().optional() })
      }
    },
    controller.getFollowingFeed as any
  );

  server.get(
    '/user/:username',
    {
      preHandler: [optionalAuth],
      schema: {
        params: z.object({ username: z.string().min(1) }),
        querystring: z.object({ cursor: z.string().optional() })
      }
    },
    controller.getUserFeed as any
  );

  server.get(
    '/replies/:postId',
    {
      preHandler: [optionalAuth],
      schema: {
        params: z.object({ postId: z.string().uuid() }),
        querystring: z.object({ cursor: z.string().optional() })
      }
    },
    controller.getReplies as any
  );
}
