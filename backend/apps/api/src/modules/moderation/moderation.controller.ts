import { FastifyRequest, FastifyReply } from 'fastify';
import { ModerationService } from './moderation.service';

export class ModerationController {
  private service = new ModerationService();

  createReport = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.service.createReport(
      request.user!.userId,
      request.body as any,
    );
    return reply.status(201).send(result);
  };

  getAdminQueue = async (request: FastifyRequest, reply: FastifyReply) => {
    const q = request.query as any;
    const result = await this.service.getAdminQueue(q.cursor, q.status, q.type);
    return reply.send(result);
  };

  resolveReport = async (
    request: FastifyRequest<{ Params: { reportId: string } }>,
    reply: FastifyReply,
  ) => {
    const result = await this.service.resolveReport(
      request.params.reportId,
      request.user!.userId,
      request.body as any,
    );
    return reply.send(result);
  };

  dismissReport = async (
    request: FastifyRequest<{ Params: { reportId: string } }>,
    reply: FastifyReply,
  ) => {
    const result = await this.service.dismissReport(
      request.params.reportId,
      request.user!.userId,
      (request.body as any).note,
    );
    return reply.send(result);
  };

  shadowbanUser = async (
    request: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply,
  ) => {
    const result = await this.service.shadowbanUser(
      request.params.userId,
      request.user!.userId,
    );
    return reply.send(result);
  };

  suspendUser = async (
    request: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply,
  ) => {
    const body = request.body as any;
    const result = await this.service.suspendUser(
      request.params.userId,
      request.user!.userId,
      body.reason,
      body.expiresAt,
    );
    return reply.send(result);
  };

  unsuspendUser = async (
    request: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply,
  ) => {
    const result = await this.service.unsuspendUser(
      request.params.userId,
      request.user!.userId,
    );
    return reply.send(result);
  };

  removePost = async (
    request: FastifyRequest<{ Params: { postId: string } }>,
    reply: FastifyReply,
  ) => {
    const result = await this.service.removePost(
      request.params.postId,
      request.user!.userId,
    );
    return reply.send(result);
  };

  restorePost = async (
    request: FastifyRequest<{ Params: { postId: string } }>,
    reply: FastifyReply,
  ) => {
    const result = await this.service.restorePost(
      request.params.postId,
      request.user!.userId,
    );
    return reply.send(result);
  };

  getMyActions = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.service.getMyActions(request.user!.userId);
    return reply.send(result);
  };

  createAppeal = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;
    const result = await this.service.createAppeal(
      request.user!.userId,
      body.actionId,
      body.reason,
    );
    return reply.status(201).send(result);
  };

  getAdminAppeals = async (request: FastifyRequest, reply: FastifyReply) => {
    const q = request.query as any;
    const result = await this.service.getAdminAppeals(q.cursor);
    return reply.send(result);
  };

  resolveAppeal = async (
    request: FastifyRequest<{ Params: { appealId: string }; Body: any }>,
    reply: FastifyReply,
  ) => {
    const body = request.body as any;
    const result = await this.service.resolveAppeal(
      request.params.appealId,
      request.user!.userId,
      body.status,
      body.note,
    );
    return reply.send(result);
  };
}
