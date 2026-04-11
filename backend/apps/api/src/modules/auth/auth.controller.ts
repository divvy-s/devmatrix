import { FastifyRequest, FastifyReply } from 'fastify';
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

  refresh = async (
    request: FastifyRequest<{ Body?: { refreshToken?: string } }>,
    reply: FastifyReply,
  ) => {
    // Extract from header or body
    let token = request.body?.refreshToken;
    if (!token && request.headers.authorization?.startsWith('Bearer ')) {
      token = request.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new Error('Refresh token required'); // Will map to 500 or validation error
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
