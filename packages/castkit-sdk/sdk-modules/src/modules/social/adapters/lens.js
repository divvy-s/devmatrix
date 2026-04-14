import {
  asNumber,
  isValidEthAddress,
  normalizeIpfsUrl,
  pickFirstArray,
  pickFirstString,
  shortenAddress,
  toUnixTimestamp
} from '../utils.js';

function extractMediaFromMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return [];

  const urls = [];
  const mediaEntries = pickFirstArray(
    metadata.media,
    metadata.attachments,
    metadata.content?.media,
    metadata.asset
  );

  for (const item of mediaEntries) {
    if (!item || typeof item !== 'object') continue;

    const rawUrl = pickFirstString(
      item.url,
      item.item,
      item.original?.url,
      item.optimized?.uri,
      item.raw?.uri
    );

    const normalized = normalizeIpfsUrl(rawUrl);
    if (normalized) urls.push(normalized);
  }

  const fallbackImage = normalizeIpfsUrl(
    pickFirstString(metadata.image, metadata.image?.item, metadata.image?.raw?.uri)
  );

  if (fallbackImage) urls.push(fallbackImage);

  return [...new Set(urls)].slice(0, 4);
}

function extractAuthor(raw) {
  const author = raw.by || raw.profile || raw.author || {};
  const metadata = author.metadata || {};

  const address = pickFirstString(author.ownedBy, author.address, author.owner);
  const normalizedAddress = isValidEthAddress(address) ? address.toLowerCase() : null;

  const username = pickFirstString(author.handle?.localName, author.handle, author.username);
  const displayName = pickFirstString(metadata.displayName, metadata.name, author.name, username) || shortenAddress(normalizedAddress);

  const avatar = normalizeIpfsUrl(
    pickFirstString(
      metadata.picture,
      metadata.picture?.optimized?.uri,
      metadata.picture?.raw?.uri,
      author.picture?.original?.url,
      author.avatar
    )
  );

  return {
    address: normalizedAddress,
    name: displayName,
    username: username ? `@${username}` : null,
    avatar,
    sourceProfileId: pickFirstString(author.id)
  };
}

export function normalizeLensPost(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const postId = pickFirstString(raw.id);
  if (!postId) return null;

  const metadata = raw.metadata || raw.content || {};
  const createdAt = pickFirstString(raw.createdAt, raw.timestamp) || new Date().toISOString();

  const stats = raw.stats || raw.operations || {};

  return {
    id: `lens:${postId}`,
    source: 'lens',
    sourcePostId: postId,
    text: pickFirstString(metadata.content, metadata.description, raw.text) || '',
    createdAt,
    createdAtUnix: toUnixTimestamp(createdAt),
    author: extractAuthor(raw),
    media: extractMediaFromMetadata(metadata),
    urls: {
      canonical: pickFirstString(raw.url, raw.permalink),
      profile: null
    },
    stats: {
      likes: asNumber(stats.totalUpvotes, asNumber(stats.upvotes)),
      recasts: asNumber(stats.totalAmountOfMirrors, asNumber(stats.mirrors)),
      replies: asNumber(stats.totalAmountOfComments, asNumber(stats.comments))
    }
  };
}
