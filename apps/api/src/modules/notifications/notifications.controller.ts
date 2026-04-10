import { FastifyRequest, FastifyReply } from 'fastify';
import { NotificationsService } from './notifications.service';

export class NotificationsController {
  private service = new NotificationsService();

  getNotifications = async (request: FastifyRequest<{ Querystring: { cursor?: string } }>, reply: FastifyReply) => {
    const result = await this.service.getNotifications(request.user!.userId, request.query.cursor);
    return reply.send(result);
  };

  readAll = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.service.readAll(request.user!.userId);
    return reply.send(result);
  };

  readOne = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const result = await this.service.readOne(request.params.id, request.user!.userId);
    return reply.send(result);
  };

  getPreferences = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.service.getPreferences(request.user!.userId);
    return reply.send(result);
  };

  updatePreferences = async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
    const result = await this.service.updatePreferences(request.user!.userId, request.body);
    return reply.send(result);
  };
}
