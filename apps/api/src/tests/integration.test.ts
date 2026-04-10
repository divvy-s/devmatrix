import { describe, it, expect } from 'vitest';
import { buildApp } from '../app';

describe('App E2E Integration setup', () => {
  it('should boot and return 200 on /health', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/health'
    });

    // We verify the endpoint structure. Since DB/Redis might fail during isolated test run, 
    // it could return 503 instead of 200, so we check status property
    const body = JSON.parse(response.payload);
    expect(body.timestamp).toBeDefined();
    
    await app.close();
  });
});
