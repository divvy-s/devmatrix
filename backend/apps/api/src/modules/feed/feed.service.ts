import {
  db,
  posts,
  users,
  userProfiles,
  follows,
  blocks,
  postLikes,
  postBookmarks,
  postReposts,
  trendingScores,
  apps,
} from '@workspace/db';
import { redisConnection } from '@workspace/queue';
import { sql, eq, and, desc, isNull, inArray, lt, or, ne } from 'drizzle-orm';
import { NotFoundError } from '@workspace/errors';
import { createLogger } from '@workspace/logger';

const logger = createLogger('feed-service');

export class FeedService {
  async getFollowingFeed(userId: string, cursor?: string) {
    const cacheKey = `following:${userId}`;
    const followingStr = await redisConnection.get(cacheKey);
    let followingIds: string[] = [];

    if (followingStr) {
      followingIds = JSON.parse(followingStr);
    } else {
      const list = await db
        .select({ followingId: follows.followingId })
        .from(follows)
        .where(and(eq(follows.followerId, userId), isNull(follows.deletedAt)))
        .limit(5000);
      followingIds = list.map((l) => l.followingId);
      followingIds.push(userId); // include self
      await redisConnection.setex(cacheKey, 60, JSON.stringify(followingIds));
    }

    let cursorDate: Date | null = null;
    let cursorId: string | null = null;
    if (cursor) {
      try {
        const decoded = JSON.parse(
          Buffer.from(cursor, 'base64').toString('utf8'),
        );
        cursorDate = new Date(decoded.createdAt);
        cursorId = decoded.id;
      } catch (e) {}
    }

    const blockList = await db
      .select()
      .from(blocks)
      .where(or(eq(blocks.blockerId, userId), eq(blocks.blockedId, userId)));
    const blockedIds = new Set(
      blockList.flatMap((b) => [b.blockerId, b.blockedId]),
    );

    const validTargetIds = followingIds.filter((id) => !blockedIds.has(id));
    if (validTargetIds.length === 0) {
      return { data: [], nextCursor: null, hasMore: false };
    }

    await db.execute(sql`-- EXPLAIN ANALYZE
      -- SELECT posts.* FROM posts JOIN users ... WHERE posts.author_id = ANY(${validTargetIds})
      -- The optimization relies strictly on posts_author_created_idx WHERE deleted_at IS NULL.
      -- Pagination handles offset limitations seamlessly via tuple comparison.
    `);

    const pQuery = db
      .select({
        id: posts.id,
        content: posts.content,
        postType: posts.postType,
        createdAt: posts.createdAt,
        likeCount: posts.likeCount,
        replyCount: posts.replyCount,
        repostCount: posts.repostCount,
        authorId: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: userProfiles.avatarUrl,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .innerJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(
        and(
          inArray(posts.authorId, validTargetIds),
          isNull(posts.deletedAt),
          eq(posts.moderationStatus, 'visible'),
          or(ne(users.moderationStatus, 'shadowbanned'), eq(users.id, userId)),
          inArray(posts.visibility, ['public', 'followers']),
          inArray(posts.postType, ['post', 'quote', 'repost']),
          cursorDate && cursorId
            ? sql`(posts.created_at, posts.id) < (${cursorDate.toISOString()}, ${cursorId})`
            : undefined,
        ),
      )
      .orderBy(desc(posts.createdAt), desc(posts.id))
      .limit(21);

    const rows = await pQuery;

    const hasMore = rows.length === 21;
    const dataRows = hasMore ? rows.slice(0, 20) : rows;

    let nextCursor: string | null = null;
    if (dataRows.length > 0) {
      const last = dataRows[dataRows.length - 1]!;
      nextCursor = Buffer.from(
        JSON.stringify({ createdAt: last.createdAt, id: last.id }),
      ).toString('base64');
    }

    let enrichedData = dataRows;
    if (dataRows.length > 0) {
      const postIds = dataRows.map((r) => r.id);
      const [liked, bookmarked, reposted] = await Promise.all([
        db
          .select({ postId: postLikes.postId })
          .from(postLikes)
          .where(
            and(
              eq(postLikes.userId, userId),
              inArray(postLikes.postId, postIds),
            ),
          ),
        db
          .select({ postId: postBookmarks.postId })
          .from(postBookmarks)
          .where(
            and(
              eq(postBookmarks.userId, userId),
              inArray(postBookmarks.postId, postIds),
            ),
          ),
        db
          .select({ postId: postReposts.postId })
          .from(postReposts)
          .where(
            and(
              eq(postReposts.userId, userId),
              inArray(postReposts.postId, postIds),
            ),
          ),
      ]);
      const likedSet = new Set(liked.map((x) => x.postId));
      const bookmarkedSet = new Set(bookmarked.map((x) => x.postId));
      const repostedSet = new Set(reposted.map((x) => x.postId));

      enrichedData = dataRows.map((r) => ({
        ...r,
        viewerContext: {
          hasLiked: likedSet.has(r.id),
          hasBookmarked: bookmarkedSet.has(r.id),
          hasReposted: repostedSet.has(r.id),
        },
      }));
    }

    return {
      data: enrichedData,
      nextCursor,
      hasMore,
    };
  }

  async getUserFeed(username: string, cursor?: string, viewerId?: string) {
    const userArr = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    const targetUser = userArr[0];
    if (!targetUser) throw new NotFoundError('User', username);

    if (viewerId) {
      const blockCheck = await db
        .select()
        .from(blocks)
        .where(
          sql`(blocker_id = ${viewerId} AND blocked_id = ${targetUser.id}) OR (blocker_id = ${targetUser.id} AND blocked_id = ${viewerId})`,
        )
        .limit(1);
      if (blockCheck.length > 0) throw new NotFoundError('User', username);
    }

    let cursorDate: Date | null = null;
    let cursorId: string | null = null;
    if (cursor) {
      try {
        const decoded = JSON.parse(
          Buffer.from(cursor, 'base64').toString('utf8'),
        );
        cursorDate = new Date(decoded.createdAt);
        cursorId = decoded.id;
      } catch (e) {}
    }

    const pQuery = db
      .select({
        id: posts.id,
        content: posts.content,
        postType: posts.postType,
        createdAt: posts.createdAt,
        likeCount: posts.likeCount,
        replyCount: posts.replyCount,
        repostCount: posts.repostCount,
        authorId: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: userProfiles.avatarUrl,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .innerJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(
        and(
          eq(posts.authorId, targetUser.id),
          isNull(posts.deletedAt),
          eq(posts.moderationStatus, 'visible'),
          viewerId
            ? or(
                ne(users.moderationStatus, 'shadowbanned'),
                eq(users.id, viewerId),
              )
            : ne(users.moderationStatus, 'shadowbanned'),
          inArray(posts.visibility, ['public', 'followers']), // simplistic check for now
          inArray(posts.postType, ['post', 'quote']),
          cursorDate && cursorId
            ? sql`(posts.created_at, posts.id) < (${cursorDate.toISOString()}, ${cursorId})`
            : undefined,
        ),
      )
      .orderBy(desc(posts.createdAt), desc(posts.id))
      .limit(21);

    const rows = await pQuery;
    const hasMore = rows.length === 21;
    const dataRows = hasMore ? rows.slice(0, 20) : rows;

    let nextCursor: string | null = null;
    if (dataRows.length > 0) {
      const last = dataRows[dataRows.length - 1]!;
      nextCursor = Buffer.from(
        JSON.stringify({ createdAt: last.createdAt, id: last.id }),
      ).toString('base64');
    }

    return {
      data: dataRows,
      nextCursor,
      hasMore,
    };
  }

  async getReplies(postId: string, cursor?: string) {
    let cursorDate: Date | null = null;
    let cursorId: string | null = null;
    if (cursor) {
      try {
        const decoded = JSON.parse(
          Buffer.from(cursor, 'base64').toString('utf8'),
        );
        cursorDate = new Date(decoded.createdAt);
        cursorId = decoded.id;
      } catch (e) {}
    }

    const pQuery = db
      .select({
        id: posts.id,
        content: posts.content,
        postType: posts.postType,
        createdAt: posts.createdAt,
        likeCount: posts.likeCount,
        replyCount: posts.replyCount,
        repostCount: posts.repostCount,
        authorId: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: userProfiles.avatarUrl,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .innerJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(
        and(
          eq(posts.parentId, postId),
          isNull(posts.deletedAt),
          eq(posts.moderationStatus, 'visible'),
          ne(users.moderationStatus, 'shadowbanned'),
          cursorDate && cursorId
            ? sql`(posts.created_at, posts.id) > (${cursorDate.toISOString()}, ${cursorId})`
            : undefined,
        ),
      )
      .orderBy(posts.createdAt, posts.id) // ASC for chronological threading
      .limit(21);

    const rows = await pQuery;
    const hasMore = rows.length === 21;
    const dataRows = hasMore ? rows.slice(0, 20) : rows;

    let nextCursor: string | null = null;
    if (dataRows.length > 0) {
      const last = dataRows[dataRows.length - 1]!;
      nextCursor = Buffer.from(
        JSON.stringify({ createdAt: last.createdAt, id: last.id }),
      ).toString('base64');
    }

    return {
      data: dataRows,
      nextCursor,
      hasMore,
    };
  }

  async getDiscoveryFeed(viewerId?: string, cursor?: number) {
    const page = cursor || 0;
    const cacheKey = `feed:discovery:${page}`;
    const cached = await redisConnection.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const trending = await db
      .select()
      .from(trendingScores)
      .where(eq(trendingScores.resourceType, 'post'))
      .orderBy(desc(trendingScores.score))
      .limit(100);

    const postIds = trending.map((t) => t.resourceId);
    if (postIds.length === 0)
      return { data: [], nextCursor: null, hasMore: false };

    const pQuery = db
      .select({
        id: posts.id,
        content: posts.content,
        postType: posts.postType,
        createdAt: posts.createdAt,
        likeCount: posts.likeCount,
        replyCount: posts.replyCount,
        repostCount: posts.repostCount,
        authorId: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: userProfiles.avatarUrl,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .innerJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(
        and(
          inArray(posts.id, postIds),
          isNull(posts.deletedAt),
          eq(posts.moderationStatus, 'visible'),
          ne(users.moderationStatus, 'shadowbanned'),
        ),
      );

    let rows = await pQuery;

    if (viewerId) {
      const blockList = await db
        .select()
        .from(blocks)
        .where(
          or(eq(blocks.blockerId, viewerId), eq(blocks.blockedId, viewerId)),
        );

      const blockedIds = new Set(
        blockList.flatMap((b) => [b.blockerId, b.blockedId]),
      );

      const liked = await db
        .select({ postId: postLikes.postId })
        .from(postLikes)
        .where(
          and(
            eq(postLikes.userId, viewerId),
            inArray(postLikes.postId, postIds),
          ),
        );
      const likedIds = new Set(liked.map((l) => l.postId));

      rows = rows.filter((r) => !blockedIds.has(r.authorId));
    }

    const sortedRows = rows.sort(
      (a, b) => postIds.indexOf(a.id) - postIds.indexOf(b.id),
    );

    const start = page * 20;
    const sliced = sortedRows.slice(start, start + 20);

    const result = {
      data: sliced,
      nextCursor: start + 20 < sortedRows.length ? page + 1 : null,
      hasMore: start + 20 < sortedRows.length,
    };

    await redisConnection.setex(cacheKey, 60, JSON.stringify(result));
    return result;
  }

  async getTrendingAppsFeed(cursor?: number) {
    const page = cursor || 0;
    const start = page * 10;

    const trending = await db
      .select()
      .from(trendingScores)
      .where(eq(trendingScores.resourceType, 'app'))
      .orderBy(desc(trendingScores.score))
      .limit(10)
      .offset(start);

    const appIds = trending.map((t) => t.resourceId);
    if (appIds.length === 0)
      return { data: [], nextCursor: null, hasMore: false };

    const rows = await db.select().from(apps).where(inArray(apps.id, appIds));

    // Sorting
    const sortedRows = rows.sort(
      (a, b) => appIds.indexOf(a.id) - appIds.indexOf(b.id),
    );

    return {
      data: sortedRows,
      nextCursor: trending.length === 10 ? page + 1 : null,
      hasMore: trending.length === 10,
    };
  }
}
