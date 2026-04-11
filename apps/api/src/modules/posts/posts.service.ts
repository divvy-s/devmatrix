import {
  db,
  posts,
  postEdits,
  postLikes,
  postBookmarks,
  postReposts,
  mediaAttachments,
  outboxEvents,
  users,
  userProfiles,
  blocks,
  follows,
} from '@workspace/db';
import { eq, and, sql, isNull, inArray } from 'drizzle-orm';
import {
  BusinessError,
  NotFoundError,
  ForbiddenError,
} from '@workspace/errors';
import { v4 as uuidv4 } from 'uuid';

export class PostsService {
  async createPost(
    authorId: string,
    data: {
      content: string;
      parentId?: string;
      quotedPostId?: string;
      mediaIds?: string[];
      visibility?: 'public' | 'followers';
    },
  ) {
    if (data.content.length < 1 || data.content.length > 500) {
      throw new BusinessError(
        'VALIDATION_ERROR',
        'Content must be between 1 and 500 characters.',
      );
    }

    let postType = 'post';
    let rootId: string | null = null;
    let actualParentId: string | null = null;

    if (data.parentId) {
      const parentArr = await db
        .select()
        .from(posts)
        .where(eq(posts.id, data.parentId))
        .limit(1);
      if (
        !parentArr[0] ||
        parentArr[0].deletedAt ||
        parentArr[0].moderationStatus === 'removed'
      ) {
        throw new NotFoundError('Parent Post', data.parentId);
      }
      postType = 'reply';
      actualParentId = data.parentId;
      // Inherit root_id from parent or use parent's id as root
      rootId = parentArr[0].rootId || parentArr[0].id;
    } else if (data.quotedPostId) {
      const quotedArr = await db
        .select()
        .from(posts)
        .where(eq(posts.id, data.quotedPostId))
        .limit(1);
      if (!quotedArr[0] || quotedArr[0].deletedAt) {
        throw new NotFoundError('Quoted Post', data.quotedPostId);
      }
      postType = 'quote';
    }

    const postId = uuidv4();

    return await db.transaction(async (tx) => {
      // 1. Insert Post
      await tx.insert(posts).values({
        id: postId,
        authorId,
        content: data.content,
        parentId: actualParentId,
        rootId,
        postType,
        quotedPostId: data.quotedPostId,
        visibility: data.visibility || 'public',
      });

      // 2. Increment parent reply count
      if (actualParentId) {
        await tx.execute(
          sql`UPDATE posts SET reply_count = reply_count + 1 WHERE id = ${actualParentId}`,
        );
      }

      // 3. Link media
      if (data.mediaIds && data.mediaIds.length > 0) {
        if (data.mediaIds.length > 4)
          throw new BusinessError('VALIDATION_ERROR', 'Max 4 media allowed');

        const medias = await tx
          .select()
          .from(mediaAttachments)
          .where(inArray(mediaAttachments.id, data.mediaIds));
        for (const m of medias) {
          if (m.uploaderId !== authorId || m.status !== 'ready') {
            throw new BusinessError(
              'VALIDATION_ERROR',
              'Invalid or unready media',
            );
          }
        }

        await tx
          .update(mediaAttachments)
          .set({ postId })
          .where(inArray(mediaAttachments.id, data.mediaIds));
      }

      // 4. Outbox
      const postArr = await tx
        .select()
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);

      await tx.insert(outboxEvents).values({
        type: 'post.created',
        payload: { post: postArr[0] },
        actorId: authorId,
      });

      return postArr[0];
    });
  }

  async getPostContext(postId: string, requesterUserId?: string) {
    const postArr = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    const post = postArr[0];

    if (!post) {
      throw new NotFoundError('Post', postId);
    }

    if (post.deletedAt) {
      return { deleted: true, id: postId };
    }
    if (post.moderationStatus === 'removed') {
      return { removed: true, id: postId };
    }

    // Check block
    if (requesterUserId && requesterUserId !== post.authorId) {
      const blockCheck = await db
        .select()
        .from(blocks)
        .where(
          sql`(blocker_id = ${post.authorId} AND blocked_id = ${requesterUserId}) OR (blocker_id = ${requesterUserId} AND blocked_id = ${post.authorId})`,
        )
        .limit(1);
      if (blockCheck.length > 0) throw new NotFoundError('Post', postId); // Mask blocked as not found
    }

    // Check visibility
    if (post.visibility === 'followers' && requesterUserId !== post.authorId) {
      if (!requesterUserId) throw new ForbiddenError('followers-only');
      const followCheck = await db
        .select()
        .from(follows)
        .where(
          and(
            eq(follows.followerId, requesterUserId),
            eq(follows.followingId, post.authorId),
            isNull(follows.deletedAt),
          ),
        )
        .limit(1);
      if (!followCheck[0]) throw new ForbiddenError('followers-only');
    }

    const authorArr = await db
      .select()
      .from(users)
      .where(eq(users.id, post.authorId))
      .limit(1);
    const profileArr = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, post.authorId))
      .limit(1);

    const medias = await db
      .select()
      .from(mediaAttachments)
      .where(eq(mediaAttachments.postId, postId));

    let viewerContext = undefined;
    if (requesterUserId) {
      const [liked, bookmarked, reposted] = await Promise.all([
        db
          .select()
          .from(postLikes)
          .where(
            and(
              eq(postLikes.postId, postId),
              eq(postLikes.userId, requesterUserId),
            ),
          )
          .limit(1),
        db
          .select()
          .from(postBookmarks)
          .where(
            and(
              eq(postBookmarks.postId, postId),
              eq(postBookmarks.userId, requesterUserId),
            ),
          )
          .limit(1),
        db
          .select()
          .from(postReposts)
          .where(
            and(
              eq(postReposts.postId, postId),
              eq(postReposts.userId, requesterUserId),
            ),
          )
          .limit(1),
      ]);
      viewerContext = {
        hasLiked: !!liked[0],
        hasBookmarked: !!bookmarked[0],
        hasReposted: !!reposted[0],
      };
    }

    return {
      post,
      media: medias,
      author: {
        id: authorArr[0]!.id,
        username: authorArr[0]!.username,
        displayName: authorArr[0]!.displayName,
        profile: profileArr[0],
      },
      viewerContext,
    };
  }

  async updatePost(postId: string, authorId: string, content: string) {
    if (content.length < 1 || content.length > 500) {
      throw new BusinessError(
        'VALIDATION_ERROR',
        'Content must be between 1 and 500 characters.',
      );
    }

    return await db.transaction(async (tx) => {
      const postArr = await tx
        .select()
        .from(posts)
        .where(and(eq(posts.id, postId), eq(posts.authorId, authorId)))
        .limit(1);
      const post = postArr[0];
      if (!post || post.deletedAt) throw new NotFoundError('Post', postId);
      if (post.postType === 'repost')
        throw new BusinessError('VALIDATION_ERROR', 'Cannot edit repost');

      await tx.insert(postEdits).values({
        postId,
        content: post.content,
        editorId: authorId,
      });

      await tx
        .update(posts)
        .set({ content, updatedAt: new Date() })
        .where(eq(posts.id, postId));

      await tx.insert(outboxEvents).values({
        type: 'post.edited',
        payload: { postId, content },
        actorId: authorId,
      });

      const updatedArr = await tx
        .select()
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);
      return updatedArr[0];
    });
  }

  async deletePost(postId: string, authorId: string) {
    await db.transaction(async (tx) => {
      const postArr = await tx
        .select()
        .from(posts)
        .where(and(eq(posts.id, postId), eq(posts.authorId, authorId)))
        .limit(1);
      const post = postArr[0];
      if (!post || post.deletedAt) throw new NotFoundError('Post', postId);

      await tx
        .update(posts)
        .set({ deletedAt: new Date() })
        .where(eq(posts.id, postId));

      if (post.parentId) {
        await tx.execute(
          sql`UPDATE posts SET reply_count = reply_count - 1 WHERE id = ${post.parentId} AND reply_count > 0`,
        );
      }

      await tx.insert(outboxEvents).values({
        type: 'post.deleted',
        payload: { postId },
        actorId: authorId,
      });
    });
  }

  async like(postId: string, userId: string) {
    return await db.transaction(async (tx) => {
      const insertion = await tx
        .insert(postLikes)
        .values({ userId, postId })
        .onConflictDoNothing()
        .returning({ id: postLikes.id });

      if (insertion.length > 0) {
        await tx.execute(
          sql`UPDATE posts SET like_count = like_count + 1 WHERE id = ${postId}`,
        );
        await tx.insert(outboxEvents).values({
          type: 'post.liked',
          payload: { postId, userId },
          actorId: userId,
        });
      }
      const postArr = await tx
        .select({ likeCount: posts.likeCount })
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);
      return { liked: true, likeCount: postArr[0]?.likeCount || 0 };
    });
  }

  async unlike(postId: string, userId: string) {
    return await db.transaction(async (tx) => {
      const deletion = await tx
        .delete(postLikes)
        .where(and(eq(postLikes.userId, userId), eq(postLikes.postId, postId)))
        .returning({ id: postLikes.id });
      if (deletion.length > 0) {
        await tx.execute(
          sql`UPDATE posts SET like_count = like_count - 1 WHERE id = ${postId} AND like_count > 0`,
        );
        await tx.insert(outboxEvents).values({
          type: 'post.unliked',
          payload: { postId, userId },
          actorId: userId,
        });
      }
      const postArr = await tx
        .select({ likeCount: posts.likeCount })
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);
      return { liked: false, likeCount: postArr[0]?.likeCount || 0 };
    });
  }

  async repost(postId: string, userId: string) {
    await db.transaction(async (tx) => {
      const targetArr = await tx
        .select({ authorId: posts.authorId })
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);
      if (targetArr[0]?.authorId === userId)
        throw new BusinessError('VALIDATION_ERROR', 'Cannot repost own post');

      const insertion = await tx
        .insert(postReposts)
        .values({ userId, postId })
        .onConflictDoNothing()
        .returning({ id: postReposts.id });
      if (insertion.length > 0) {
        await tx.execute(
          sql`UPDATE posts SET repost_count = repost_count + 1 WHERE id = ${postId}`,
        );
        await tx.insert(outboxEvents).values({
          type: 'post.reposted',
          payload: { postId, userId },
          actorId: userId,
        });
      }
    });
  }

  async unrepost(postId: string, userId: string) {
    await db.transaction(async (tx) => {
      const deletion = await tx
        .delete(postReposts)
        .where(
          and(eq(postReposts.userId, userId), eq(postReposts.postId, postId)),
        )
        .returning({ id: postReposts.id });
      if (deletion.length > 0) {
        await tx.execute(
          sql`UPDATE posts SET repost_count = repost_count - 1 WHERE id = ${postId} AND repost_count > 0`,
        );
        await tx.insert(outboxEvents).values({
          type: 'post.unreposted',
          payload: { postId, userId },
          actorId: userId,
        });
      }
    });
  }

  async bookmark(postId: string, userId: string) {
    await db.transaction(async (tx) => {
      const insertion = await tx
        .insert(postBookmarks)
        .values({ userId, postId })
        .onConflictDoNothing()
        .returning({ postId: postBookmarks.postId });
      if (insertion.length > 0) {
        await tx.execute(
          sql`UPDATE posts SET bookmark_count = bookmark_count + 1 WHERE id = ${postId}`,
        );
      }
    });
  }

  async unbookmark(postId: string, userId: string) {
    await db.transaction(async (tx) => {
      const deletion = await tx
        .delete(postBookmarks)
        .where(
          and(
            eq(postBookmarks.userId, userId),
            eq(postBookmarks.postId, postId),
          ),
        )
        .returning({ postId: postBookmarks.postId });
      if (deletion.length > 0) {
        await tx.execute(
          sql`UPDATE posts SET bookmark_count = bookmark_count - 1 WHERE id = ${postId} AND bookmark_count > 0`,
        );
      }
    });
  }
}
