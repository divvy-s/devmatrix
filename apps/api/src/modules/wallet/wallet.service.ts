import { db, walletAddresses, externalIdentities, outboxEvents } from '@workspace/db';
import { eq, and, ne, count } from 'drizzle-orm';
import { redisConnection } from '@workspace/queue';
import { ethers } from 'ethers';
import { UnauthorizedError, ConflictError, BusinessError, NotFoundError } from '@workspace/errors';
import { v4 as uuidv4 } from 'uuid';

export class WalletService {
  async getWallets(userId: string) {
    return await db.select().from(walletAddresses).where(eq(walletAddresses.userId, userId));
  }

  async addWallet(userId: string, data: { address: string; signature: string; nonce: string; chainId: number }) {
    const normalized = data.address.toLowerCase();

    // Verify signature logic
    const storedStr = await redisConnection.get(`nonce:${normalized}`);
    if (!storedStr) throw new UnauthorizedError('NONCE_NOT_FOUND');

    const stored = JSON.parse(storedStr);
    if (stored.nonce !== data.nonce) throw new UnauthorizedError('NONCE_EXPIRED');

    await redisConnection.del(`nonce:${normalized}`);

    const recoveredAddress = ethers.verifyMessage(stored.message, data.signature);
    if (recoveredAddress.toLowerCase() !== normalized) {
      throw new UnauthorizedError('INVALID_SIGNATURE');
    }

    return await db.transaction(async (tx) => {
      // Check if address belongs to someone else
      const existingOwnerArr = await tx.select({ userId: walletAddresses.userId }).from(walletAddresses).where(eq(walletAddresses.address, normalized));
      if (existingOwnerArr.length > 0) {
        if (existingOwnerArr[0]?.userId !== userId) {
          throw new ConflictError('wallet_addresses', 'address');
        } else {
          return { status: 'already_linked' }; // Idempotent
        }
      }

      await tx.insert(walletAddresses).values({
        id: uuidv4(),
        userId,
        address: normalized,
        chainId: data.chainId,
        isPrimary: false,
        verifiedAt: new Date(),
      });

      await tx.insert(externalIdentities).values({
        id: uuidv4(),
        userId,
        provider: 'wallet',
        providerId: normalized,
        verifiedAt: new Date(),
      });

      await tx.insert(outboxEvents).values({
        type: 'wallet.linked',
        payload: { userId, address: normalized },
        actorId: userId,
      });

      const newWalletArr = await tx.select().from(walletAddresses).where(eq(walletAddresses.address, normalized)).limit(1);
      return newWalletArr[0];
    });
  }

  async deleteWallet(userId: string, address: string) {
    const normalized = address.toLowerCase();

    await db.transaction(async (tx) => {
      const walletArr = await tx.select().from(walletAddresses).where(and(eq(walletAddresses.userId, userId), eq(walletAddresses.address, normalized))).limit(1);
      if (!walletArr[0]) {
        throw new NotFoundError('Wallet', normalized);
      }

      // Check external identity count
      const result = await tx.select({ value: count(externalIdentities.id) }).from(externalIdentities).where(eq(externalIdentities.userId, userId));
      const totalIdentities = result[0]?.value;
      if ((totalIdentities || 0) <= 1) {
        throw new BusinessError('LAST_IDENTITY_CANNOT_REMOVE', 'Cannot remove the last identity of an account');
      }

      await tx.delete(walletAddresses).where(eq(walletAddresses.address, normalized));
      await tx.delete(externalIdentities).where(and(eq(externalIdentities.userId, userId), eq(externalIdentities.provider, 'wallet'), eq(externalIdentities.providerId, normalized)));
    });
  }

  async setPrimaryWallet(userId: string, address: string) {
    const normalized = address.toLowerCase();

    return await db.transaction(async (tx) => {
      const walletArr = await tx.select().from(walletAddresses).where(and(eq(walletAddresses.userId, userId), eq(walletAddresses.address, normalized))).limit(1);
      if (!walletArr[0]) {
        throw new NotFoundError('Wallet', normalized);
      }

      await tx.update(walletAddresses).set({ isPrimary: false }).where(eq(walletAddresses.userId, userId));
      await tx.update(walletAddresses).set({ isPrimary: true }).where(and(eq(walletAddresses.userId, userId), eq(walletAddresses.address, normalized)));

      const updatedArr = await tx.select().from(walletAddresses).where(eq(walletAddresses.address, normalized)).limit(1);
      return updatedArr[0];
    });
  }
}
