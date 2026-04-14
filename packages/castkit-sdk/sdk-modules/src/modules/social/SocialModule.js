import BaseModule from '../../interfaces/BaseModule.js';
import { normalizeFarcasterPost } from './adapters/farcaster.js';
import { normalizeLensPost } from './adapters/lens.js';
import { fetchSocialFeedPayload } from './social-client.js';
import { isValidEthAddress } from './utils.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function normalizeLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(parsed)));
}

function stableSortByTimeDesc(items) {
  return [...items].sort((a, b) => {
    if (b.createdAtUnix === a.createdAtUnix) {
      return a.id.localeCompare(b.id);
    }
    return b.createdAtUnix - a.createdAtUnix;
  });
}

export class SocialModule extends BaseModule {
  get name() {
    return 'SocialModule';
  }

  async onInit() {
    this.core.logger.info(this.name, 'Social Module initialized. Aggregation and normalization pipeline is ready.');
  }

  async getFeed(options = {}) {
    const limit = normalizeLimit(options.limit);
    const enrichWithIdentity = options.enrichWithIdentity !== false;

    this.core.events.emit('social:feed-started', {
      limit,
      enrichWithIdentity
    });

    try {
      const response = await fetchSocialFeedPayload({
        endpoint: this.options.endpoint || '/api/castkit/social/feed',
        limit,
        cursorFarcaster: options.cursorFarcaster,
        cursorLens: options.cursorLens,
        signal: this.controller.signal
      });

      const farcasterSource = response?.providers?.farcaster || {};
      const lensSource = response?.providers?.lens || {};

      const farcasterPosts = (Array.isArray(farcasterSource.items) ? farcasterSource.items : [])
        .map((item) => normalizeFarcasterPost(item))
        .filter(Boolean);

      const lensPosts = (Array.isArray(lensSource.items) ? lensSource.items : [])
        .map((item) => normalizeLensPost(item))
        .filter(Boolean);

      const merged = this._dedupePosts([...farcasterPosts, ...lensPosts]);
      const sorted = stableSortByTimeDesc(merged).slice(0, limit);
      const items = enrichWithIdentity
        ? await this._enrichAuthorIdentity(sorted, options.identityChainId)
        : sorted;

      const result = {
        items,
        sources: {
          farcaster: {
            status: farcasterSource.status || 'unknown',
            count: farcasterPosts.length,
            error: farcasterSource.error || null
          },
          lens: {
            status: lensSource.status || 'unknown',
            count: lensPosts.length,
            error: lensSource.error || null
          }
        },
        nextCursor: {
          farcaster: farcasterSource.nextCursor || null,
          lens: lensSource.nextCursor || null
        },
        partialFailure: [farcasterSource.status, lensSource.status].includes('error'),
        fetchedAt: response?.fetchedAt || new Date().toISOString()
      };

      this.core.events.emit('social:feed-success', {
        total: result.items.length,
        sources: result.sources,
        partialFailure: result.partialFailure
      });

      return result;
    } catch (error) {
      this.core.events.emit('social:feed-failed', error);
      this.core.logger.error(this.name, 'Failed to aggregate social feed.', error);
      throw error;
    }
  }

  _dedupePosts(posts) {
    const byId = new Map();

    for (const post of posts) {
      if (!post?.id) continue;
      if (!byId.has(post.id)) {
        byId.set(post.id, post);
      }
    }

    return [...byId.values()];
  }

  async _enrichAuthorIdentity(posts, chainId) {
    const identityModule = this.core.getModule('IdentityModule');
    if (!identityModule) return posts;

    const uniqueAddresses = [...new Set(
      posts
        .map((post) => post?.author?.address)
        .filter((address) => isValidEthAddress(address))
    )];

    if (uniqueAddresses.length === 0) return posts;

    let identities;
    try {
      identities = await identityModule.resolveMany(uniqueAddresses, { chainId });
    } catch (error) {
      this.core.logger.warn(this.name, 'Identity enrichment skipped due to resolver failure.', error?.message || String(error));
      return posts;
    }

    const byAddress = new Map();
    for (const identity of identities) {
      if (identity?.error || !identity?.address) continue;
      byAddress.set(identity.address.toLowerCase(), identity);
    }

    return posts.map((post) => {
      const address = post?.author?.address;
      if (!isValidEthAddress(address)) return post;

      const identity = byAddress.get(address.toLowerCase());
      if (!identity) return post;

      return {
        ...post,
        author: {
          ...post.author,
          name: identity.name || post.author.name,
          avatar: identity.avatar || post.author.avatar,
          identitySources: identity.sources || null
        }
      };
    });
  }
}
