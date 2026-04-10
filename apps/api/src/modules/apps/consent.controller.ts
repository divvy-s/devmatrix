import { FastifyRequest, FastifyReply } from 'fastify';
import { ConsentService } from './consent.service';

export class ConsentController {
  private service = new ConsentService();

  getConsentDetails = async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
    const result = await this.service.getConsentDetails(request.user!.userId, request.params.slug);
    return reply.send(result);
  };

  installApp = async (request: FastifyRequest<{ Params: { slug: string }, Body: any }>, reply: FastifyReply) => {
    const scopes = (request.body as any).grantScopes || [];
    const result = await this.service.installApp(request.user!.userId, request.params.slug, scopes);
    return reply.status(201).send(result);
  };

  uninstallApp = async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
    await this.service.uninstallApp(request.user!.userId, request.params.slug);
    return reply.status(204).send();
  };

  revokePermissions = async (request: FastifyRequest<{ Params: { slug: string }, Body: any }>, reply: FastifyReply) => {
    const scopes = (request.body as any).scopes || [];
    await this.service.revokePermissions(request.user!.userId, request.params.slug, scopes);
    return reply.status(204).send();
  };

  listInstalledApps = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.service.listInstalledApps(request.user!.userId);
    return reply.send(result);
  };
}
