import { db, appStorage } from '@workspace/db';
import { eq, and } from 'drizzle-orm';
import { NotFoundError, BusinessError } from '@workspace/errors';

export class StorageService {
  async getStorage(appId: string, userId: string, key: string) {
    const arr = await db.select().from(appStorage).where(and(eq(appStorage.appId, appId), eq(appStorage.userId, userId), eq(appStorage.key, key))).limit(1);
    if (!arr[0]) throw new NotFoundError('StorageKey', key);
    return { key: arr[0]!.key, value: arr[0]!.value };
  }

  async putStorage(appId: string, userId: string, key: string, value: any) {
    if (key.length > 255) throw new BusinessError('Key exceeds 255 chars', 'INVALID_KEY');
    if (JSON.stringify(value).length > 65536) throw new BusinessError('Value exceeds 64KB', 'PAYLOAD_TOO_LARGE');

    const arr = await db.insert(appStorage).values({
      appId, userId, key, value
    }).onConflictDoUpdate({
      target: [appStorage.appId, appStorage.userId, appStorage.key],
      set: { value, updatedAt: new Date() }
    }).returning();

    return { key: arr[0]!.key, value: arr[0]!.value, updatedAt: arr[0]!.updatedAt };
  }

  async deleteStorage(appId: string, userId: string, key: string) {
    await db.delete(appStorage).where(and(eq(appStorage.appId, appId), eq(appStorage.userId, userId), eq(appStorage.key, key)));
  }

  async listStorage(appId: string, userId: string) {
    const arr = await db.select({ key: appStorage.key }).from(appStorage).where(and(eq(appStorage.appId, appId), eq(appStorage.userId, userId))).limit(1000);
    return { keys: arr.map(a => a.key), count: arr.length };
  }
}
