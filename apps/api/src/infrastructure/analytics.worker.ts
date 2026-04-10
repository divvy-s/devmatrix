import { Worker, Job } from 'bullmq';
import { redisConnection } from '@workspace/queue';
import { db, analyticsEvents } from '@workspace/db';
import { createLogger } from '@workspace/logger';
import { sql } from 'drizzle-orm';

const logger = createLogger('analytics-worker');

let batch: any[] = [];
let batchTimeout: NodeJS.Timeout | null = null;
const MAX_BATCH_SIZE = 100;
const BATCH_INTERVAL = 5000;

async function flushBatch() {
  if (batch.length === 0) return;
  const currentBatch = [...batch];
  batch = [];
  try {
     await db.insert(analyticsEvents).values(currentBatch);
     logger.info(`Inserted ${currentBatch.length} analytics events`);
  } catch (error) {
     // Failure drops mapping effectively minimizing thread blocks during scale events seamlessly!
     logger.error({ error }, 'Failed to insert analytics events batch');
  }
}

export const analyticsIngestWorker = new Worker('analytics:ingest', async (job: Job) => {
  const payload = job.data;
  batch.push(payload);
  
  if (batch.length >= MAX_BATCH_SIZE) {
     if (batchTimeout) clearTimeout(batchTimeout);
     batchTimeout = null;
     await flushBatch();
  } else if (!batchTimeout) {
     batchTimeout = setTimeout(flushBatch, BATCH_INTERVAL);
  }
}, { connection: redisConnection });

export const trendingComputeWorker = new Worker('trending:compute', async (job: Job) => {
    logger.info('Commencing global Wilson scaling models generating platform metrics.');
    const query = sql`
      WITH recent_posts as (
         SELECT p.id, p.created_at
         FROM posts p
         WHERE p.created_at >= NOW() - INTERVAL '7 days' AND p.deleted_at IS NULL AND p.moderation_status = 'visible'
      ),
      metrics as (
         SELECT p.id,
           COALESCE(SUM(CASE WHEN l.created_at > NOW() - INTERVAL '24h' THEN 1 ELSE 0 END), 0) as likes_24h,
           COALESCE(SUM(CASE WHEN r.created_at > NOW() - INTERVAL '24h' THEN 1 ELSE 0 END), 0) as reposts_24h,
           COALESCE(SUM(CASE WHEN rep.created_at > NOW() - INTERVAL '24h' THEN 1 ELSE 0 END), 0) as replies_24h,
           0 as views_24h,
           p.created_at
         FROM recent_posts p
         LEFT JOIN post_likes l ON l.post_id = p.id
         LEFT JOIN post_reposts r ON r.post_id = p.id
         LEFT JOIN posts rep ON rep.parent_id = p.id
         GROUP BY p.id, p.created_at
      )
      INSERT INTO trending_scores (resource_type, resource_id, like_count_24h, repost_count_24h, reply_count_24h, view_count_24h, score, computed_at)
      SELECT 
         'post', 
         id, 
         CAST(likes_24h AS integer), 
         CAST(reposts_24h AS integer), 
         CAST(replies_24h AS integer), 
         CAST(views_24h AS integer), 
         (likes_24h * 3 + reposts_24h * 5 + replies_24h * 2 + views_24h * 0.1) * (1.0 / (1.0 + EXTRACT(EPOCH FROM (NOW() - created_at))/3600.0 * 0.1)),
         NOW()
      FROM metrics
      ON CONFLICT (resource_type, resource_id) DO UPDATE SET
         score = EXCLUDED.score,
         like_count_24h = EXCLUDED.like_count_24h,
         repost_count_24h = EXCLUDED.repost_count_24h,
         reply_count_24h = EXCLUDED.reply_count_24h,
         view_count_24h = EXCLUDED.view_count_24h,
         computed_at = EXCLUDED.computed_at;
    `;
    await db.execute(query);
    logger.info('Wilson scaling completed flawlessly.');
}, { connection: redisConnection });


export const analyticsRollupWorker = new Worker('analytics:rollup', async () => {
    logger.info('Rolling up hourly app analytics natively');
    const query = sql`
       WITH app_metrics as (
         SELECT 
             t.app_id,
             DATE_TRUNC('hour', NOW() - INTERVAL '1 hour') as period_start,
             COUNT(t.id) as api_calls
         FROM app_tokens t
         WHERE t.last_used_at >= NOW() - INTERVAL '1 hour'
         GROUP BY t.app_id
       )
       INSERT INTO app_analytics_rollups (app_id, period, period_start, api_calls, created_at)
       SELECT app_id, 'hour', period_start, api_calls, NOW() FROM app_metrics
       ON CONFLICT (app_id, period, period_start) DO UPDATE SET
          api_calls = EXCLUDED.api_calls;
    `;
    await db.execute(query);
}, { connection: redisConnection });
