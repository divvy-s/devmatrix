import { FastifyRequest, FastifyReply } from 'fastify';
import { AppsService } from './apps.service';

export class AppsController {
  private service = new AppsService();

  createApp = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.service.createApp(
      request.user!.userId,
      request.body as any,
    );
    return reply.status(201).send(result);
  };

  createVersion = async (
    request: FastifyRequest<{ Params: { slug: string } }>,
    reply: FastifyReply,
  ) => {
    const result = await this.service.createVersion(
      request.user!.userId,
      request.params.slug,
      request.body as any,
    );
    return reply.status(201).send(result);
  };

  listApprovedApps = async (request: FastifyRequest, reply: FastifyReply) => {
    const q = request.query as any;
    const result = await this.service.listApprovedApps(
      q.cursor,
      q.category,
      q.search,
    );
    return reply.send(result);
  };

  getAppBySlug = async (
    request: FastifyRequest<{ Params: { slug: string } }>,
    reply: FastifyReply,
  ) => {
    const result = await this.service.getAppBySlug(
      request.params.slug,
      request.user?.userId,
    );
    return reply.send(result);
  };

  getDeveloperApps = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.service.getDeveloperApps(request.user!.userId);
    return reply.send(result);
  };

  rollbackVersion = async (
    request: FastifyRequest<{ Params: { slug: string; versionId: string } }>,
    reply: FastifyReply,
  ) => {
    const result = await this.service.rollbackVersion(
      request.user!.userId,
      request.params.slug,
      request.params.versionId,
    );
    return reply.send(result);
  };
}
