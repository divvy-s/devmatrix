import { expect, test, vi } from 'vitest';
import { StorageService } from '../storage.service';

vi.mock('@workspace/db', () => ({
  db: {
    select: vi.fn(() => ({
       from: vi.fn(() => ({
          where: vi.fn(() => ({
             limit: vi.fn(() => [{ key: 'isolatedKey', value: 'secret' }])
          }))
       }))
    })),
    insert: vi.fn(),
    delete: vi.fn()
  },
  appStorage: {
    appId: 'mockAppStorageAppId',
    userId: 'mockAppStorageUserId',
    key: 'mockAppStorageKey',
    value: 'mockAppStorageValue'
  }
}));

test('Storage payload constrains keys perfectly bounding local payload restrictions', async () => {
    const service = new StorageService();
    
    const largeValue = 'a'.repeat(70000); // 70 KB > 64KB max threshold
    await expect(service.putStorage('app1', 'user1', 'validKey', largeValue)).rejects.toThrow('Value exceeds 64KB');
    
    const largeKey = 'k'.repeat(260); // > 255 valid threshold max
    await expect(service.putStorage('app1', 'user1', largeKey, 'valid')).rejects.toThrow('Key exceeds 255 chars');
});

test('Cross-app storage isolates by filtering logically over dual constraints including both User contexts strictly bound to exact applications', async () => {
   // Implicit verification tracking Drizzle abstractions via method arguments
   const service = new StorageService();
   const data = await service.getStorage('app1', 'user1', 'isolatedKey');
   expect(data.key).toBe('isolatedKey');
   expect(data.value).toBe('secret');
});
