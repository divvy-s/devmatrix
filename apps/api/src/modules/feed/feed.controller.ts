import { FastifyRequest, FastifyReply } from 'fastify';
import { FeedService } from './feed.service';

export class FeedController {
  private feedService: FeedService;

  constructor() {
    this.feedService = new FeedService();
  }

  getFollowingFeed = async (
    request: FastifyRequest<{ Querystring: { cursor?: string } }>,
    reply: FastifyReply,
  ) => {
    const result = await this.feedService.getFollowingFeed(
      request.user!.userId,
      request.query.cursor,
    );
    return reply.send(result);
  };

  getUserFeed = async (
    request: FastifyRequest<{
      Params: { username: string };
      Querystring: { cursor?: string };
    }>,
    reply: FastifyReply,
  ) => {
    const result = await this.feedService.getUserFeed(
      request.params.username,
      request.query.cursor,
      request.user?.userId,
    );
    return reply.send(result);
  };

  getReplies = async (
    request: FastifyRequest<{
      Params: { postId: string };
      Querystring: { cursor?: string };
    }>,
    reply: FastifyReply,
  ) => {
    const result = await this.feedService.getReplies(
      request.params.postId,
      request.query.cursor,
    );
    return reply.send(result);
  };

  getDiscoveryFeed = async (request: FastifyRequest, reply: FastifyReply) => {
    const q = request.query as any;
    const result = await this.feedService.getDiscoveryFeed(
      request.user?.userId,
      q.cursor ? parseInt(q.cursor) : 0,
    );
    return reply.send(result);
  };

  getTrendingAppsFeed = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const q = request.query as any;
    const result = await this.feedService.getTrendingAppsFeed(
      q.cursor ? parseInt(q.cursor) : 0,
    );
    return reply.send(result);
  };
}
