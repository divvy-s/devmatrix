import { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError } from '@workspace/errors';
import { AuthService } from './auth.service';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  generateNonce = async (
    request: FastifyRequest<{ Querystring: { address: string } }>,
    reply: FastifyReply,
  ) => {
    const { address } = request.query;
    const result = await this.authService.generateNonce(address);
    return reply.send(result);
  };

  verifyWallet = async (
    request: FastifyRequest<{
      Body: { address: string; signature: string; nonce: string };
    }>,
    reply: FastifyReply,
  ) => {
    const { address, signature, nonce } = request.body;
    const result = await this.authService.verifyWallet(
      address,
      signature,
      nonce,
    );
    return reply.send(result);
  };

  verifyGitHub = async (
    request: FastifyRequest<{
      Body: { accessToken: string };
    }>,
    reply: FastifyReply,
  ) => {
    const { accessToken } = request.body;
    const result = await this.authService.verifyGitHub(accessToken);
    return reply.send(result);
  };

  verifyGoogle = async (
    request: FastifyRequest<{
      Body: { idToken: string };
    }>,
    reply: FastifyReply,
  ) => {
    const { idToken } = request.body;
    const result = await this.authService.verifyGoogle(idToken);
    return reply.send(result);
  };

  refresh = async (
    request: FastifyRequest<{ Body?: { refreshToken?: string } }>,
    reply: FastifyReply,
  ) => {
    const token = request.body?.refreshToken;
    if (!token) {
      throw new UnauthorizedError('REFRESH_TOKEN_MISSING');
    }

    const result = await this.authService.refresh(token);
    return reply.send(result);
  };

  logout = async (request: FastifyRequest, reply: FastifyReply) => {
    const sessionId = request.user?.sessionId;
    if (sessionId) {
      await this.authService.logout(sessionId);
    }
    return reply.send({ success: true });
  };

  logoutAll = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user?.userId;
    if (userId) {
      await this.authService.logoutAll(userId);
    }
    return reply.send({ success: true });
  };
}
