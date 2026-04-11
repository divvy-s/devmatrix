import { FastifyRequest, FastifyReply } from 'fastify';
import { StorageService } from './storage.service';

export class StorageController {
  private service = new StorageService();

  getStorage = async (
    request: FastifyRequest<{ Params: { key: string } }>,
    reply: FastifyReply,
  ) => {
    const req = request as any;
    const result = await this.service.getStorage(
      req.appId,
      req.user!.userId,
      request.params.key,
    );
    return reply.send(result);
  };

  putStorage = async (
    request: FastifyRequest<{ Params: { key: string }; Body: any }>,
    reply: FastifyReply,
  ) => {
    const req = request as any;
    const result = await this.service.putStorage(
      req.appId,
      req.user!.userId,
      request.params.key,
      (request.body as any).value,
    );
    return reply.send(result);
  };

  deleteStorage = async (
    request: FastifyRequest<{ Params: { key: string } }>,
    reply: FastifyReply,
  ) => {
    const req = request as any;
    await this.service.deleteStorage(
      req.appId,
      req.user!.userId,
      request.params.key,
    );
    return reply.status(204).send();
  };

  listStorage = async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const result = await this.service.listStorage(req.appId, req.user!.userId);
    return reply.send(result);
  };
}
