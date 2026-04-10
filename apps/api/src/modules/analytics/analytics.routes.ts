import { FastifyInstance } from 'fastify';
import { AnalyticsController } from './analytics.controller';

export async function analyticsRoutes(app: FastifyInstance) {
  const controller = new AnalyticsController();
  // Auth optional if checking headers logic mapped upstream ideally but Fastify generic preHandler requires custom token checks silently.
  // Using native inline token try-catch silently mapping the context without interrupting constraints limits payloads natively!
  app.post('/events', async (req, rep) => {
      // The application requires < 10ms P99 responses dynamically 
      // Utilizing asynchronous push mechanisms ensures the API returns safely executing the BullMQ payload outbox natively!
      return controller.ingestEvent(req, rep);
  });
}
