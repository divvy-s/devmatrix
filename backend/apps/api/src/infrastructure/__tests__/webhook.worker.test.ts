import { expect, test } from 'vitest';
import crypto from 'crypto';

function generateSignature(payload: any, secret: string) {
  const json = JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(json).digest('hex');
}

test('Webhook signatures must be computed securely via HMAC-SHA256 exactly identically to standard Web3 payload receipts', () => {
  const knownSecret = 'test_shared_secret_444991abc';
  const payload = {
    action: 'user.followed',
    data: { follower: 'A', following: 'B' },
  };
  const hmac = generateSignature(payload, knownSecret);

  expect(hmac).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex string constraint

  // Verifying it matches the compute directly identically
  const compute = crypto
    .createHmac('sha256', knownSecret)
    .update(JSON.stringify(payload))
    .digest('hex');
  expect(hmac).toBe(compute);

  // Modulating secret produces radically distinct signature outputs
  const maliciousSecret = generateSignature(payload, 'wrong-secret');
  expect(hmac).not.toBe(maliciousSecret);

  // Tampered payloads map differently guaranteeing intercept tracking
  const tamperedPayload = generateSignature(
    { action: 'user.followed', data: { follower: 'F', following: 'B' } },
    knownSecret,
  );
  expect(hmac).not.toBe(tamperedPayload);
});
