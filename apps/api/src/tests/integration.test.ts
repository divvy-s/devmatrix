import { describe, it, expect, vi, afterAll } from 'vitest';
import { buildApp } from '../app';

vi.mock('@workspace/db', () => ({
  db: {
    execute: vi.fn().mockResolvedValue([{ 1: 1 }]),
  },
  sql: vi.fn(),
}));

vi.mock('@workspace/queue', () => ({
  redisConnection: {
    ping: vi.fn().mockResolvedValue('PONG'),
  },
}));

describe('App E2E Integration setup', () => {
  it('should boot and return 200 on /health', async () => {
    const app = await buildApp();

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
    } finally {
      await app.close();
    }
  });
});
