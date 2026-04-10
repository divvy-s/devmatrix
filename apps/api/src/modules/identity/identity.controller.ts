import { FastifyRequest, FastifyReply } from 'fastify';
import { IdentityService } from './identity.service';

export class IdentityController {
  private identityService: IdentityService;

  constructor() {
    this.identityService = new IdentityService();
  }

  getMe = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.userId;
    const result = await this.identityService.getMe(userId);
    return reply.send(result);
  };

  updateProfile = async (
    request: FastifyRequest<{ Body: { displayName?: string; bio?: string; avatarUrl?: string; websiteUrl?: string; location?: string; } }>,
    reply: FastifyReply
  ) => {
    const userId = request.user!.userId;
    const result = await this.identityService.updateProfile(userId, request.body);
    return reply.send(result);
  };

  checkUsername = async (request: FastifyRequest<{ Body: { username: string } }>, reply: FastifyReply) => {
    const { username } = request.body;
    const result = await this.identityService.checkUsername(username);
    return reply.send(result);
  };

  getProfileByUsername = async (request: FastifyRequest<{ Params: { username: string } }>, reply: FastifyReply) => {
    const { username } = request.params;
    const requesterUserId = request.user?.userId;
    const result = await this.identityService.getProfileByUsername(username, requesterUserId);
    return reply.send(result);
  };
}
