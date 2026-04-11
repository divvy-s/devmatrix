import { FastifyRequest, FastifyReply } from 'fastify';
import { analyticsIngestQueue } from '@workspace/queue';

export class AnalyticsController {
  ingestEvent = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;

    const allowed = [
      'post.viewed',
      'app.opened',
      'app.closed',
      'feed.scrolled',
      'profile.viewed',
      'search.performed',
      'notification.clicked',
    ];
    if (!allowed.includes(body.eventType)) {
      return reply.status(400).send({ error: 'Invalid event type' });
    }

    const payload = {
      eventType: body.eventType,
      userId: request.user?.userId || null,
      resourceType: body.resourceType,
      resourceId: body.resourceId,
      appId: body.appId,
      properties: body.properties || {},
      ipHash: request.ip, // Basic ip tracking
    };

    analyticsIngestQueue.add('ingest', payload).catch((err) => {
      console.error(
        'Failed pushing analytic event to queue asynchronously',
        err,
      );
    });

    return reply.status(202).send({ status: 'accepted' });
  };
}
