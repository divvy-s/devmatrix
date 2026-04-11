import { describe, it, expect, vi } from 'vitest';
import { SocialService } from '../modules/social/social.service';
import { BusinessError } from '@workspace/errors';

describe('SocialService', () => {
  const service = new SocialService();

  it('should prevent user from following themselves', async () => {
    vi.spyOn(service, 'fetchUserByUsername').mockResolvedValue({
      id: 'user_1',
    } as any);
    await expect(service.follow('user_1', 'user_1')).rejects.toThrow(
      BusinessError,
    );
  });

  it('should prevent user from blocking themselves', async () => {
    vi.spyOn(service, 'fetchUserByUsername').mockResolvedValue({
      id: 'user_1',
    } as any);
    await expect(service.block('user_1', 'user_1')).rejects.toThrow(
      BusinessError,
    );
  });
});
