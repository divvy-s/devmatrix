import { FastifyRequest, FastifyReply } from 'fastify';
import { SocialService } from './social.service';

export class SocialController {
  private socialService: SocialService;

  constructor() {
    this.socialService = new SocialService();
  }

  follow = async (request: FastifyRequest<{ Params: { username: string } }>, reply: FastifyReply) => {
    const result = await this.socialService.follow(request.user!.userId, request.params.username);
    return reply.send(result);
  };

  unfollow = async (request: FastifyRequest<{ Params: { username: string } }>, reply: FastifyReply) => {
    const result = await this.socialService.unfollow(request.user!.userId, request.params.username);
    return reply.send(result);
  };

  getFollowers = async (request: FastifyRequest<{ Params: { username: string }; Querystring: { cursor?: string } }>, reply: FastifyReply) => {
    const result = await this.socialService.getFollowers(request.params.username, request.user?.userId, request.query.cursor);
    return reply.send(result);
  };

  getFollowing = async (request: FastifyRequest<{ Params: { username: string }; Querystring: { cursor?: string } }>, reply: FastifyReply) => {
    const result = await this.socialService.getFollowing(request.params.username, request.user?.userId, request.query.cursor);
    return reply.send(result);
  };

  block = async (request: FastifyRequest<{ Params: { username: string } }>, reply: FastifyReply) => {
    await this.socialService.block(request.user!.userId, request.params.username);
    return reply.status(200).send({ success: true });
  };

  unblock = async (request: FastifyRequest<{ Params: { username: string } }>, reply: FastifyReply) => {
    await this.socialService.unblock(request.user!.userId, request.params.username);
    return reply.status(200).send({ success: true });
  };

  mute = async (request: FastifyRequest<{ Params: { username: string } }>, reply: FastifyReply) => {
    await this.socialService.mute(request.user!.userId, request.params.username);
    return reply.status(200).send({ success: true });
  };

  unmute = async (request: FastifyRequest<{ Params: { username: string } }>, reply: FastifyReply) => {
    await this.socialService.unmute(request.user!.userId, request.params.username);
    return reply.status(200).send({ success: true });
  };

  getBlocks = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.socialService.getBlocks(request.user!.userId);
    return reply.send(result);
  };

  getMutes = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.socialService.getMutes(request.user!.userId);
    return reply.send(result);
  };
}
