const fs = require('fs');

let feed = fs.readFileSync('apps/api/src/modules/feed/feed.service.ts', 'utf8');

if (!feed.includes('trendingScores')) {
  feed = feed.replace(
    "import { db, posts, users, userProfiles, follows, blocks, postLikes, postBookmarks, postReposts } from '@workspace/db';",
    "import { db, posts, users, userProfiles, follows, blocks, postLikes, postBookmarks, postReposts, trendingScores, apps } from '@workspace/db';",
  );
  // Wait! Before replacing the end `}`, let's replace `}\n` at the end
  const newMethods = `
  async getDiscoveryFeed(viewerId?: string, cursor?: number) {
     const page = cursor || 0;
     const cacheKey = \`feed:discovery:\${page}\`;
     let cached = await redisConnection.get(cacheKey);
     if (cached) return JSON.parse(cached);

     const trending = await db.select().from(trendingScores)
        .where(eq(trendingScores.resourceType, 'post'))
        .orderBy(desc(trendingScores.score))
        .limit(100);

     const postIds = trending.map(t => t.resourceId);
     if (postIds.length === 0) return { data: [], nextCursor: null, hasMore: false };

     const pQuery = db.select({
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
       avatarUrl: userProfiles.avatarUrl
     })
     .from(posts)
     .innerJoin(users, eq(posts.authorId, users.id))
     .innerJoin(userProfiles, eq(users.id, userProfiles.userId))
     .where(and(
       inArray(posts.id, postIds),
       isNull(posts.deletedAt),
       eq(posts.moderationStatus, 'visible'),
       ne(users.moderationStatus, 'shadowbanned')
     ));
     
     let rows = await pQuery;

     if (viewerId) {
        const blockList = await db.select().from(blocks)
           .where(or(eq(blocks.blockerId, viewerId), eq(blocks.blockedId, viewerId)));
        
        const blockedIds = new Set(blockList.flatMap(b => [b.blockerId, b.blockedId]));
        
        const liked = await db.select({ postId: postLikes.postId }).from(postLikes).where(and(eq(postLikes.userId, viewerId), inArray(postLikes.postId, postIds)));
        const likedIds = new Set(liked.map(l => l.postId));

        rows = rows.filter(r => !blockedIds.has(r.authorId));
     }

     const sortedRows = rows.sort((a, b) => postIds.indexOf(a.id) - postIds.indexOf(b.id));
     
     const start = page * 20;
     const sliced = sortedRows.slice(start, start + 20);

     const result = {
        data: sliced,
        nextCursor: start + 20 < sortedRows.length ? page + 1 : null,
        hasMore: start + 20 < sortedRows.length
     };
     
     await redisConnection.setex(cacheKey, 60, JSON.stringify(result));
     return result;
  }

  async getTrendingAppsFeed(cursor?: number) {
     const page = cursor || 0;
     const start = page * 10;
     
     const trending = await db.select().from(trendingScores)
        .where(eq(trendingScores.resourceType, 'app'))
        .orderBy(desc(trendingScores.score))
        .limit(10)
        .offset(start);

     const appIds = trending.map(t => t.resourceId);
     if (appIds.length === 0) return { data: [], nextCursor: null, hasMore: false };

     const rows = await db.select().from(apps).where(inArray(apps.id, appIds));
     
     // Sorting
     const sortedRows = rows.sort((a, b) => appIds.indexOf(a.id) - appIds.indexOf(b.id));

     return {
        data: sortedRows,
        nextCursor: trending.length === 10 ? page + 1 : null,
        hasMore: trending.length === 10
     };
  }
}
`;
  feed = feed.substring(0, feed.lastIndexOf('}')) + newMethods;
  fs.writeFileSync('apps/api/src/modules/feed/feed.service.ts', feed);
  console.log('Appended discovery feed properly');
}
