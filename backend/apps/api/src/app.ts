import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import {
  validatorCompiler,
  serializerCompiler,
} from 'fastify-type-provider-zod';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '@workspace/logger';
import { AppError } from '@workspace/errors';
import { healthRoutes } from './routes/health';
import { authRoutes } from './modules/auth/auth.routes';
import { identityRoutes } from './modules/identity/identity.routes';
import { walletRoutes } from './modules/wallet/wallet.routes';
import { postsRoutes } from './modules/posts/posts.routes';
import { mediaRoutes } from './modules/media/media.routes';
import { feedRoutes } from './modules/feed/feed.routes';
import { notificationsRoutes } from './modules/notifications/notifications.routes';
import { developersRoutes } from './modules/developers/developers.routes';
import { appsRoutes } from './modules/apps/apps.routes';
import { storageRoutes } from './modules/storage/storage.routes';
import { adminRoutes } from './modules/admin/admin.routes';
import { socialRoutes } from './modules/social/social.routes';

const logger = createLogger('api');

export const buildApp = async () => {
  const app = Fastify({
    logger: false, // We will use our custom logger hook
    disableRequestLogging: true,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Plugins
  await app.register(cors, { origin: true });
  await app.register(sensible);
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Request ID and Logger hooks
  app.decorateRequest('trace_id', '');

  app.addHook('onRequest', (request, reply, done) => {
    const traceId = (request.headers['x-trace-id'] as string) || uuidv4();
    request.trace_id = traceId;
    reply.header('X-Trace-ID', traceId);
    done();
  });

  app.addHook('onResponse', (request, reply, done) => {
    logger.info(
      {
        trace_id: request.trace_id,
        method: request.method,
        url: request.url,
        status: reply.statusCode,
        duration_ms: (reply as any).getResponseTime(),
      },
      'Request completed',
    );
    done();
  });

  // Global Error Handler
  app.setErrorHandler(
    (
      error: globalThis.Error & { statusCode?: number },
      request: FastifyRequest,
      reply: FastifyReply,
    ) => {
      logger.error(
        {
          trace_id: request.trace_id,
          err: error,
        },
        'Error processing request',
      );

      if (error instanceof AppError) {
        return reply
          .status(Number(error.statusCode))
          .send(error.toJSON(request.trace_id));
      }

      if (error.statusCode) {
        // Sensible or other Fastify errors
        return reply.status(error.statusCode).send({
          error: {
            code: 'HTTP_ERROR',
            message: error.message,
            trace_id: request.trace_id,
          },
        });
      }

      reply.status(500).send({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred.',
          trace_id: request.trace_id,
        },
      });
    },
  );

  // Routes
  app.register(healthRoutes, { prefix: '/health' });
  app.register(authRoutes, { prefix: '/api/v1/auth' });
  // Identity and social both mount under /api/v1/users by design: identity owns /me,
  // /check-username, /:username (profile); social adds /:username/followers, /follow, etc.
  // Keep new routes conflict-free (unique path + method per plugin).
  app.register(identityRoutes, { prefix: '/api/v1/users' });
  app.register(walletRoutes, { prefix: '/api/v1/wallets' });
  app.register(socialRoutes, { prefix: '/api/v1/users' });
  app.register(postsRoutes, { prefix: '/api/v1/posts' });
  app.register(mediaRoutes, { prefix: '/api/v1/media' });
  app.register(feedRoutes, { prefix: '/api/v1/feed' });
  app.register(notificationsRoutes, { prefix: '/api/v1/notifications' });
  app.register(developersRoutes, { prefix: '/api/v1/developers' });
  app.register(appsRoutes, { prefix: '/api/v1/apps' });
  app.register(storageRoutes, { prefix: '/api/v1/app-storage' });
  app.register(adminRoutes, { prefix: '/api/v1/admin' });

  return app;
};

// Augment Fastify Request
declare module 'fastify' {
  interface FastifyRequest {
    trace_id: string;
  }
}
