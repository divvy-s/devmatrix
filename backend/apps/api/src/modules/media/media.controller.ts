import { FastifyRequest, FastifyReply } from 'fastify';
import { db, mediaAttachments } from '@workspace/db';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { mediaQueue } from '@workspace/queue';
import { v4 as uuidv4 } from 'uuid';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.AWS_ENDPOINT || undefined,
});

const bucket = process.env.S3_BUCKET || 'media-bucket';

export class MediaController {
  upload = async (request: FastifyRequest, reply: FastifyReply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    const { filename, mimetype } = data;

    const validMimetypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
    ];
    if (!validMimetypes.includes(mimetype)) {
      return reply.status(400).send({ error: 'Invalid file type' });
    }

    const buffer = await data.toBuffer();
    if (data.file.truncated) {
      return reply.status(413).send({ error: 'File too large' });
    }

    const sizeBytes = buffer.length;
    if (mimetype.startsWith('image/') && sizeBytes > 10 * 1024 * 1024) {
      return reply.status(413).send({ error: 'Image exceeds 10MB limit' });
    }

    const ext = filename.split('.').pop() || '';
    const id = uuidv4();
    const userId = request.user!.userId;
    const storageKey = `media/${userId}/${id}.${ext}`;

    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: storageKey,
          Body: buffer,
          ContentType: mimetype,
        }),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply
        .status(500)
        .send({ error: 'Upload failed', details: message });
    }

    const url = `https://${bucket}.s3.amazonaws.com/${storageKey}`;

    try {
      await db.insert(mediaAttachments).values({
        id,
        uploaderId: userId,
        url,
        storageKey,
        mediaType: mimetype,
        sizeBytes,
        status: 'pending',
      });
    } catch (err) {
      try {
        await s3.send(
          new DeleteObjectCommand({ Bucket: bucket, Key: storageKey }),
        );
      } catch {
        /* best-effort cleanup */
      }
      throw err;
    }

    await mediaQueue.add('media:process', { mediaId: id });

    return reply.status(201).send({
      id,
      url,
      status: 'pending',
    });
  };
}
