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

    let enrichedData = dataRows as any[];
    if (viewerId && dataRows.length > 0) {
      const postIds = dataRows.map((r) => r.id);
      const [liked, bookmarked, reposted] = await Promise.all([
        db
          .select({ postId: postLikes.postId })
          .from(postLikes)
          .where(
            and(
              eq(postLikes.userId, viewerId),
              inArray(postLikes.postId, postIds),
            ),
          ),
        db
          .select({ postId: postBookmarks.postId })
          .from(postBookmarks)
          .where(
            and(
              eq(postBookmarks.userId, viewerId),
              inArray(postBookmarks.postId, postIds),
            ),
          ),
        db
          .select({ postId: postReposts.postId })
          .from(postReposts)
          .where(
            and(
              eq(postReposts.userId, viewerId),
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

  async getReplies(postId: string, cursor?: string, viewerId?: string) {
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

    let enrichedData = dataRows as any[];
    if (viewerId && dataRows.length > 0) {
      const postIds = dataRows.map((r) => r.id);
      const [liked, bookmarked, reposted] = await Promise.all([
        db
          .select({ postId: postLikes.postId })
          .from(postLikes)
          .where(
            and(
              eq(postLikes.userId, viewerId),
              inArray(postLikes.postId, postIds),
            ),
          ),
        db
          .select({ postId: postBookmarks.postId })
          .from(postBookmarks)
          .where(
            and(
              eq(postBookmarks.userId, viewerId),
              inArray(postBookmarks.postId, postIds),
            ),
          ),
        db
          .select({ postId: postReposts.postId })
          .from(postReposts)
          .where(
            and(
              eq(postReposts.userId, viewerId),
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

  async getDiscoveryFeed(viewerId?: string, cursor?: number) {
    const page = cursor || 0;
    const cacheKey = `feed:discovery:ids:${page}`; // Cache is now global for the page's IDs
    const cachedIds = await redisConnection.get(cacheKey);
    
    let postIds: string[] = [];
    if (cachedIds) {
      postIds = JSON.parse(cachedIds);
    } else {
      const trending = await db
        .select({ resourceId: trendingScores.resourceId })
        .from(trendingScores)
        .innerJoin(posts, eq(trendingScores.resourceId, posts.id))
        .where(
          and(
            eq(trendingScores.resourceType, 'post'),
            isNull(posts.parentId),
            isNull(posts.deletedAt),
            eq(posts.moderationStatus, 'visible'),
          ),
        )
        .orderBy(desc(trendingScores.score))
        .limit(100);

      postIds = trending.map((t) => t.resourceId);

      if (postIds.length === 0) {
        const recent = await db
          .select({ id: posts.id })
          .from(posts)
          .where(
            and(
              isNull(posts.deletedAt),
              eq(posts.moderationStatus, 'visible'),
              isNull(posts.parentId),
            ),
          )
          .orderBy(desc(posts.createdAt))
          .limit(100);
        postIds = recent.map((r) => r.id);
      }
      
      if (postIds.length > 0) {
        await redisConnection.setex(cacheKey, 30, JSON.stringify(postIds)); // Shorter cache for IDs
      }
    }

    if (postIds.length === 0)
      return { data: [], nextCursor: null, hasMore: false };

    const start = page * 20;
    const pageIds = postIds.slice(start, start + 20);
    
    if (pageIds.length === 0)
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
          inArray(posts.id, pageIds),
          isNull(posts.deletedAt),
          eq(posts.moderationStatus, 'visible'),
          ne(users.moderationStatus, 'shadowbanned'),
          isNull(posts.parentId),
        ),
      );

    let rows = await pQuery;

    // Maintain original order from postIds
    rows.sort((a, b) => pageIds.indexOf(a.id) - pageIds.indexOf(b.id));

    let likedIds = new Set<string>();
    let bookmarkedIds = new Set<string>();
    let repostedIds = new Set<string>();

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

      const [liked, bookmarked, reposted] = await Promise.all([
        db
          .select({ postId: postLikes.postId })
          .from(postLikes)
          .where(
            and(
              eq(postLikes.userId, viewerId),
              inArray(postLikes.postId, pageIds),
            ),
          ),
        db
          .select({ postId: postBookmarks.postId })
          .from(postBookmarks)
          .where(
            and(
              eq(postBookmarks.userId, viewerId),
              inArray(postBookmarks.postId, pageIds),
            ),
          ),
        db
          .select({ postId: postReposts.postId })
          .from(postReposts)
          .where(
            and(
              eq(postReposts.userId, viewerId),
              inArray(postReposts.postId, pageIds),
            ),
          ),
      ]);
      likedIds = new Set(liked.map((l) => l.postId));
      bookmarkedIds = new Set(bookmarked.map((b) => b.postId));
      repostedIds = new Set(reposted.map((r) => r.postId));

      rows = rows.filter((r) => !blockedIds.has(r.authorId));
    }

    const enrichedData = rows.map((r) => ({
      ...r,
      viewerContext: viewerId ? {
        hasLiked: likedIds.has(r.id),
        hasBookmarked: bookmarkedIds.has(r.id),
        hasReposted: repostedIds.has(r.id),
      } : undefined,
    }));

    return {
      data: enrichedData,
      nextCursor: start + 20 < postIds.length ? page + 1 : null,
      hasMore: start + 20 < postIds.length,
    };
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
