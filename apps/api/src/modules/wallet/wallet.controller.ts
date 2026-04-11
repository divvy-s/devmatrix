import { FastifyRequest, FastifyReply } from 'fastify';
import { WalletService } from './wallet.service';

export class WalletController {
  private walletService: WalletService;

  constructor() {
    this.walletService = new WalletService();
  }

  getWallets = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.userId;
    const result = await this.walletService.getWallets(userId);
    return reply.send(result);
  };

  addWallet = async (
    request: FastifyRequest<{
      Body: {
        address: string;
        signature: string;
        nonce: string;
        chainId: number;
      };
    }>,
    reply: FastifyReply,
  ) => {
    const userId = request.user!.userId;
    const result = await this.walletService.addWallet(userId, request.body);
    return reply.send(result);
  };

  deleteWallet = async (
    request: FastifyRequest<{ Params: { address: string } }>,
    reply: FastifyReply,
  ) => {
    const userId = request.user!.userId;
    const { address } = request.params;
    await this.walletService.deleteWallet(userId, address);
    return reply.status(204).send();
  };

  setPrimaryWallet = async (
    request: FastifyRequest<{ Params: { address: string } }>,
    reply: FastifyReply,
  ) => {
    const userId = request.user!.userId;
    const { address } = request.params;
    const result = await this.walletService.setPrimaryWallet(userId, address);
    return reply.send(result);
  };
}
