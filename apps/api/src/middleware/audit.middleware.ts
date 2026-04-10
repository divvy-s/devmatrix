import { FastifyRequest, FastifyReply, onRequestHookHandler } from 'fastify';
import { db, auditLogs } from '@workspace/db';

export function auditLog(action: string, resourceType: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (reply.statusCode >= 400) return;

      const actorId = request.user?.userId;
      
      // Attempt to extract resource_id safely
      const params = request.params as any;
      let resourceId = params?.id || params?.username || params?.address;
      
      // Fallback to response payload if needed
      if (!resourceId) {
        // Need custom logic here if id is fetched from response instead, 
        // typically in Fastify onResponse hook you cannot read the raw response payload 
        // if it has been serialized unless intercepted. We'll use 'unknown' if absent.
        resourceId = 'unknown'; 
      }

      // We enqueue this async write without awaiting it or catching it locally
      // DO NOT await this carefully, the requirements say 'Never throws — log failures must not break the request'
      db.insert(auditLogs).values({
        actorId,
        action,
        resourceType,
        resourceId,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        traceId: request.trace_id,
      }).catch((err) => {
        request.log.error(err, 'Failed to insert audit log');
      });

    } catch (err) {
      request.log.error(err, 'Unexpected error in audit middleware');
    }
  };
}
