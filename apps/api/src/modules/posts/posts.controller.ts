import { FastifyRequest, FastifyReply } from 'fastify';
import { PostsService } from './posts.service';

export class PostsController {
  private postsService: PostsService;

  constructor() {
    this.postsService = new PostsService();
  }

  createPost = async (
    request: FastifyRequest<{ Body: { content: string; parentId?: string; quotedPostId?: string; mediaIds?: string[]; visibility?: 'public' | 'followers' } }>,
    reply: FastifyReply
  ) => {
    const result = await this.postsService.createPost(request.user!.userId, request.body);
    return reply.status(201).send(result);
  };

  getPost = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const result = await this.postsService.getPostContext(request.params.id, request.user?.userId);
    return reply.send(result);
  };

  updatePost = async (request: FastifyRequest<{ Params: { id: string }; Body: { content: string } }>, reply: FastifyReply) => {
    const result = await this.postsService.updatePost(request.params.id, request.user!.userId, request.body.content);
    return reply.send(result);
  };

  deletePost = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.postsService.deletePost(request.params.id, request.user!.userId);
    return reply.status(204).send();
  };

  like = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const result = await this.postsService.like(request.params.id, request.user!.userId);
    return reply.send(result);
  };

  unlike = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const result = await this.postsService.unlike(request.params.id, request.user!.userId);
    return reply.send(result);
  };

  repost = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.postsService.repost(request.params.id, request.user!.userId);
    return reply.send({ success: true });
  };

  unrepost = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.postsService.unrepost(request.params.id, request.user!.userId);
    return reply.send({ success: true });
  };

  bookmark = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.postsService.bookmark(request.params.id, request.user!.userId);
    return reply.send({ success: true });
  };

  unbookmark = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.postsService.unbookmark(request.params.id, request.user!.userId);
    return reply.send({ success: true });
  };
}
