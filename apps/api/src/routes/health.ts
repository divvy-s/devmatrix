import { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { db } from '@workspace/db';
import { redisConnection } from '@workspace/queue';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    let dbStatus = 'ok';
    let redisStatus = 'ok';

    try {
      await db.execute(sql`SELECT 1`);
    } catch (err) {
      dbStatus = 'error';
      request.log.error(err, 'Database health check failed');
    }

    try {
      await redisConnection.ping();
    } catch (err) {
      redisStatus = 'error';
      request.log.error(err, 'Redis health check failed');
    }

    let status = 'ok';
    if (dbStatus === 'error' || redisStatus === 'error') {
      status = 'error';
      reply.status(503);
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        redis: redisStatus,
      },
    };
  });
}
