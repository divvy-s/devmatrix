import { describe, it, expect } from 'vitest';
import { IdentityService } from '../modules/identity/identity.service';

describe('IdentityService - Username Validation', () => {
  const service = new IdentityService();

  it('should return false for username less than 3 chars', async () => {
    const res = await service.checkUsername('ab');
    expect(res.available).toBe(false);
  });

  it('should return false for reserved username', async () => {
    const res = await service.checkUsername('ADMIN'); // case-insensitive check
    expect(res.available).toBe(false);
  });

  it('should return false for invalid characters', async () => {
    const res = await service.checkUsername('user-name@');
    expect(res.available).toBe(false);
  });

  // Positive DB-backed check test would require an actual DB or mock,
  // we omit the DB mock here and rely on the negative offline checks indicating basic unit validity.
});
