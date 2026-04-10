import fastifyMultipart from '@fastify/multipart';
import { FastifyInstance } from 'fastify';
import { MediaController } from './media.controller';
import { authenticateRequest } from '../../middleware/auth.middleware';

export async function mediaRoutes(app: FastifyInstance) {
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 50 * 1024 * 1024,
    }
  });

  const controller = new MediaController();
  app.post('/upload', { preHandler: [authenticateRequest] }, controller.upload as any);
}
