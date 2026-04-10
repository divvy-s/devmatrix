import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { PostsController } from './posts.controller';
import { authenticateRequest } from '../../middleware/auth.middleware';

export async function postsRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();
  const controller = new PostsController();

  const optionalAuth = async (request: any, reply: any) => {
    if (request.headers.authorization?.startsWith('Bearer ')) {
      try {
        await authenticateRequest(request, reply);
      } catch (err) {}
    }
  };

  server.post(
    '/',
    {
      preHandler: [authenticateRequest],
      schema: {
        body: z.object({
          content: z.string().min(1).max(500),
          parentId: z.string().uuid().optional(),
          quotedPostId: z.string().uuid().optional(),
          mediaIds: z.array(z.string().uuid()).max(4).optional(),
          visibility: z.enum(['public', 'followers']).optional(),
        })
      }
    },
    controller.createPost as any
  );

  server.get(
    '/:id',
    {
      preHandler: [optionalAuth],
      schema: { params: z.object({ id: z.string().uuid() }) }
    },
    controller.getPost as any
  );

  server.patch(
    '/:id',
    {
      preHandler: [authenticateRequest],
      schema: { 
        params: z.object({ id: z.string().uuid() }),
        body: z.object({ content: z.string().min(1).max(500) })
      }
    },
    controller.updatePost as any
  );

  server.delete(
    '/:id',
    {
      preHandler: [authenticateRequest],
      schema: { params: z.object({ id: z.string().uuid() }) }
    },
    controller.deletePost as any
  );

  // Interactions
  server.post('/:id/like', { preHandler: [authenticateRequest] }, controller.like as any);
  server.delete('/:id/like', { preHandler: [authenticateRequest] }, controller.unlike as any);
  
  server.post('/:id/repost', { preHandler: [authenticateRequest] }, controller.repost as any);
  server.delete('/:id/repost', { preHandler: [authenticateRequest] }, controller.unrepost as any);
  
  server.post('/:id/bookmark', { preHandler: [authenticateRequest] }, controller.bookmark as any);
  server.delete('/:id/bookmark', { preHandler: [authenticateRequest] }, controller.unbookmark as any);
}
