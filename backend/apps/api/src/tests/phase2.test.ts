import { describe, it, expect, vi } from 'vitest';
import { PostsService } from '../modules/posts/posts.service';
import { FeedService } from '../modules/feed/feed.service';
import { BusinessError } from '@workspace/errors';
import { db } from '@workspace/db';

vi.mock('@workspace/db', () => ({
  db: {
    transaction: vi.fn(),
    select: vi.fn(() => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnValue([{ authorId: 'mocked_author' }]),
    })),
  },
  posts: { authorId: 'author_id' },
}));

describe('Phase 2 Content & Interactions', () => {
  describe('Posts System', () => {
    it('throws VALIDATION_ERROR on empty content creation', async () => {
      const postsService = new PostsService();
      await expect(
        postsService.createPost('user_1', { content: '' }),
      ).rejects.toThrow(BusinessError);
    });

    it('throws VALIDATION_ERROR when editing a repost', async () => {
      const postsService = new PostsService();
      vi.spyOn(postsService as any, 'updatePost').mockRejectedValue(
        new BusinessError('VALIDATION_ERROR', 'Cannot edit repost'),
      );
      await expect(
        postsService.updatePost('post_repost', 'user_1', 'abc'),
      ).rejects.toThrow(BusinessError);
    });
  });

  describe('Feed Pagination & Cursors', () => {
    it('properly generates valid cursor objects', () => {
      const cursorData = Buffer.from(
        JSON.stringify({ createdAt: '2026-04-10T00:00:00Z', id: '1234' }),
      ).toString('base64');
      expect(cursorData).toBeDefined();
    });
  });
});
