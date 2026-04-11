import { FastifyRequest, FastifyReply } from 'fastify';
import { WebhooksService } from './webhooks.service';

export class WebhooksController {
  private service = new WebhooksService();

  listWebhooks = async (
    request: FastifyRequest<{ Params: { appId: string } }>,
    reply: FastifyReply,
  ) => {
    const result = await this.service.listWebhooks(
      request.user!.userId,
      request.params.appId,
    );
    return reply.send(result);
  };

  listDeliveries = async (
    request: FastifyRequest<{
      Params: { appId: string; subscriptionId: string };
    }>,
    reply: FastifyReply,
  ) => {
    const result = await this.service.listDeliveries(
      request.user!.userId,
      request.params.appId,
      request.params.subscriptionId,
    );
    return reply.send(result);
  };

  retryDelivery = async (
    request: FastifyRequest<{
      Params: { appId: string; subscriptionId: string };
      Body: any;
    }>,
    reply: FastifyReply,
  ) => {
    const result = await this.service.retryDelivery(
      request.user!.userId,
      request.params.appId,
      request.params.subscriptionId,
      (request.body as any)?.deliveryId,
    );
    return reply.send(result);
  };
}
