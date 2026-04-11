import { Queue } from 'bullmq';
import { redisConnection } from './redis';

export const webhookQueue = new Queue('webhook-deliver', {
  connection: redisConnection,
});
