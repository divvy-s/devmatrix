import { FastifyRequest } from 'fastify';
import { redisConnection } from '@workspace/queue';
import { RateLimitError } from '@workspace/errors';

// Sliding window Lua script
const SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local clearBefore = now - window
redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)
local count = redis.call('ZCARD', key)
if count >= limit then
  return -1
end
redis.call('ZADD', key, now, now .. math.random())
redis.call('EXPIRE', key, window)
return count + 1
`;

export function createRateLimiter(options: { limit: number; windowSeconds: number; keyFn: (request: FastifyRequest) => string }) {
  return async (request: FastifyRequest) => {
    const key = `rate_limit:${options.keyFn(request)}`;
    const now = Date.now();
    
    // We use eval because redisConnection evaluates Lua script directly
    const count = await redisConnection.eval(
      SLIDING_WINDOW_SCRIPT,
      1,
      key,
      now,
      options.windowSeconds * 1000, // ARGV in ms
      options.limit
    ) as number;

    if (count === -1) {
      throw new RateLimitError(options.windowSeconds);
    }
  };
}

export const authLimiter = createRateLimiter({
  limit: 10,
  windowSeconds: 60,
  keyFn: (request) => `auth:${request.ip}`
});

export const writeLimiter = createRateLimiter({
  limit: 60,
  windowSeconds: 60,
  keyFn: (request) => `write:${request.user?.userId || request.ip}`
});

export const readLimiter = createRateLimiter({
  limit: 300,
  windowSeconds: 60,
  keyFn: (request) => `read:${request.user?.userId || request.ip}`
});
