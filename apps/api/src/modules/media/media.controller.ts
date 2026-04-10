import { FastifyRequest, FastifyReply } from 'fastify';
import { db, mediaAttachments } from '@workspace/db';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { mediaQueue } from '@workspace/queue';
import { v4 as uuidv4 } from 'uuid';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.AWS_ENDPOINT || undefined,
});

export class MediaController {
  upload = async (request: FastifyRequest, reply: FastifyReply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    const { filename, mimetype, file } = data;
    
    const validMimetypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'];
    if (!validMimetypes.includes(mimetype)) {
      return reply.status(400).send({ error: 'Invalid file type' });
    }

    const ext = filename.split('.').pop() || '';
    const id = uuidv4();
    const userId = request.user!.userId;
    const storageKey = `media/${userId}/${id}.${ext}`;

    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET || 'media-bucket',
          Key: storageKey,
          Body: file,
          ContentType: mimetype,
        })
      );
    } catch (err: any) {
      return reply.status(500).send({ error: 'Upload failed', details: err.message });
    }

    // Derive rough byte length read after stream finishes
    const sizeBytes = (file as any).bytesRead || 1024; // fallback safe
    
    if (mimetype.startsWith('image/') && sizeBytes > 10 * 1024 * 1024) {
      return reply.status(400).send({ error: 'Image exceeds 10MB limit' });
    }

    const url = `https://${process.env.S3_BUCKET || 'media-bucket'}.s3.amazonaws.com/${storageKey}`;

    await db.insert(mediaAttachments).values({
      id,
      uploaderId: userId,
      url,
      storageKey,
      mediaType: mimetype,
      sizeBytes,
      status: 'pending'
    });

    await mediaQueue.add('media:process', { mediaId: id });

    return reply.status(201).send({
      id,
      url,
      status: 'pending'
    });
  }
}
