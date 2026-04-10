import { FastifyRequest, FastifyReply } from 'fastify';
import { DevelopersService } from './developers.service';

export class DevelopersController {
  private service = new DevelopersService();

  register = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.service.register(request.user!.userId, request.body as any);
    return reply.status(201).send(result);
  };

  getMe = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.service.getMe(request.user!.userId);
    return reply.send(result);
  };

  updateMe = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.service.updateMe(request.user!.userId, request.body as any);
    return reply.send(result);
  };
}
