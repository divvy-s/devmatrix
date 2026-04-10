import { Queue } from 'bullmq';
import { redisConnection } from './redis';

export const analyticsIngestQueue = new Queue('analytics:ingest', { connection: redisConnection });
export const trendingComputeQueue = new Queue('trending:compute', { connection: redisConnection });
export const analyticsRollupQueue = new Queue('analytics:rollup', { connection: redisConnection });
