import { Worker, Job } from 'bullmq';
import { redisConnection } from '@workspace/queue';
import { db, mediaAttachments } from '@workspace/db';
import { eq } from 'drizzle-orm';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { createLogger } from '@workspace/logger';

const logger = createLogger('media-worker');

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.AWS_ENDPOINT || undefined,
});

export const mediaWorker = new Worker(
  'media:process',
  async (job: Job) => {
    const { mediaId } = job.data;
    const mediaArr = await db
      .select()
      .from(mediaAttachments)
      .where(eq(mediaAttachments.id, mediaId))
      .limit(1);
    const media = mediaArr[0];
    if (!media) throw new Error('Media not found');

    try {
      if (media.mediaType.startsWith('video/')) {
        await db
          .update(mediaAttachments)
          .set({ status: 'ready' })
          .where(eq(mediaAttachments.id, mediaId));
        return;
      }

      const { Body } = await s3.send(
        new GetObjectCommand({
          Bucket: process.env.S3_BUCKET || 'media-bucket',
          Key: media.storageKey,
        }),
      );

      const chunks = [];
      for await (const chunk of Body as any) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      const image = sharp(buffer);
      const metadata = await image.metadata();

      const thumbBuffer = await image
        .resize(400, 400, { fit: 'cover' })
        .webp()
        .toBuffer();

      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET || 'media-bucket',
          Key: `${media.storageKey}_thumb`,
          Body: thumbBuffer,
          ContentType: 'image/webp',
        }),
      );

      await db
        .update(mediaAttachments)
        .set({
          status: 'ready',
          width: metadata.width || null,
          height: metadata.height || null,
        })
        .where(eq(mediaAttachments.id, mediaId));

      logger.info({ mediaId }, 'Image processed successfully');
    } catch (err: any) {
      logger.error(err, 'Media processing failed');
      await db
        .update(mediaAttachments)
        .set({ status: 'failed' })
        .where(eq(mediaAttachments.id, mediaId));
      throw err;
    }
  },
  { connection: redisConnection },
);
