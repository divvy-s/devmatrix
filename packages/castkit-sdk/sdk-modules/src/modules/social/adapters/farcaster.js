import {
  asNumber,
  isValidEthAddress,
  normalizeIpfsUrl,
  pickFirstArray,
  pickFirstString,
  shortenAddress,
  toUnixTimestamp
} from '../utils.js';

function extractAuthorAddress(author = {}) {
  const directAddress = pickFirstString(author.custody_address, author.address, author.wallet_address);
  if (isValidEthAddress(directAddress)) return directAddress.toLowerCase();

  const verified = pickFirstArray(
    author.verified_addresses?.eth_addresses,
    author.verifications,
    author.verifiedAddresses
  );

  for (const candidate of verified) {
    if (isValidEthAddress(candidate)) {
      return candidate.toLowerCase();
    }
  }

  return null;
}

function extractMedia(embeds) {
  const entries = pickFirstArray(embeds, []);
  const urls = [];

  for (const embed of entries) {
    if (!embed || typeof embed !== 'object') continue;

    const possibleUrl = pickFirstString(
      embed.url,
      embed.source_url,
      embed.media?.url,
      embed.metadata?.url
    );

    const normalized = normalizeIpfsUrl(possibleUrl);
    if (normalized) urls.push(normalized);
  }

  return [...new Set(urls)].slice(0, 4);
}

function buildPermalink(castId, username, explicitPermalink) {
  if (typeof explicitPermalink === 'string' && explicitPermalink.trim()) {
    return explicitPermalink.trim();
  }

  if (username && castId) {
    return `https://warpcast.com/${username}/${castId}`;
  }

  return null;
}

export function normalizeFarcasterPost(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const castId = pickFirstString(raw.hash, raw.id, raw.cast_id);
  if (!castId) return null;

  const author = raw.author || {};
  const username = pickFirstString(author.username, author.handle);
  const address = extractAuthorAddress(author);
  const displayName = pickFirstString(author.display_name, author.displayName, username) || shortenAddress(address);
  const avatar = normalizeIpfsUrl(
    pickFirstString(author.pfp_url, author.avatar_url, author.pfp?.url)
  );

  const createdAt = pickFirstString(raw.timestamp, raw.created_at, raw.published_at) || new Date().toISOString();

  const post = {
    id: `farcaster:${castId}`,
    source: 'farcaster',
    sourcePostId: castId,
    text: pickFirstString(raw.text, raw.body?.text) || '',
    createdAt,
    createdAtUnix: toUnixTimestamp(createdAt),
    author: {
      address,
      name: displayName,
      username: username ? `@${username}` : null,
      avatar,
      sourceProfileId: pickFirstString(author.fid, author.id)
    },
    media: extractMedia(raw.embeds),
    urls: {
      canonical: buildPermalink(castId, username, raw.permalink),
      profile: username ? `https://warpcast.com/${username}` : null
    },
    stats: {
      likes: asNumber(raw.reactions?.likes_count),
      recasts: asNumber(raw.reactions?.recasts_count),
      replies: asNumber(raw.replies?.count)
    }
  };

  return post;
}
