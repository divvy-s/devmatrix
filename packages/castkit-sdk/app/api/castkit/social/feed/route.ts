import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type ProviderStatus = 'ok' | 'error' | 'disabled';

type ProviderResult = {
  status: ProviderStatus;
  items: unknown[];
  nextCursor: string | null;
  error: string | null;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function parseLimit(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(parsed)));
}

function extractArray(payload: unknown, candidates: string[][]): unknown[] {
  if (!payload || typeof payload !== 'object') return [];

  for (const path of candidates) {
    let cursor: unknown = payload;
    for (const key of path) {
      if (!cursor || typeof cursor !== 'object' || !(key in cursor)) {
        cursor = null;
        break;
      }
      cursor = (cursor as Record<string, unknown>)[key];
    }

    if (Array.isArray(cursor)) {
      return cursor;
    }
  }

  return [];
}

async function readBodySafely(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  const isJsonLike = contentType.includes('application/json') || contentType.includes('+json');
  if (isJsonLike) {
    return response.json();
  }
  return response.text();
}

function errorText(payload: unknown, fallback: string) {
  if (typeof payload === 'string' && payload.trim()) return payload;
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const maybeError = (payload as { error?: unknown }).error;
    if (typeof maybeError === 'string' && maybeError.trim()) return maybeError;
  }
  return fallback;
}

async function fetchFarcaster(limit: number, cursor: string | null): Promise<ProviderResult> {
  // Lens-only mode: keep Farcaster in the response shape but disable it intentionally.
  return {
    status: 'disabled',
    items: [],
    nextCursor: null,
    error: 'Farcaster provider is disabled in Lens-only mode.'
  };
}

async function fetchLens(limit: number, cursor: string | null): Promise<ProviderResult> {
  const lensApiUrl = process.env.CASTKIT_LENS_API_URL || 'https://api.lens.xyz/graphql';
  const lensApiKey = process.env.CASTKIT_LENS_API_KEY;

  const query = `
    query FreePosts($pageSize: PageSize!, $cursor: Cursor) {
      posts(request: { pageSize: $pageSize, cursor: $cursor, filter: { postTypes: [ROOT] } }) {
        items {
          ... on Post {
            id
            timestamp
            metadata {
              ... on TextOnlyMetadata {
                content
              }
              ... on ImageMetadata {
                content
              }
              ... on VideoMetadata {
                content
              }
              ... on ArticleMetadata {
                content
              }
            }
            author {
              address
              username {
                localName
              }
              metadata {
                name
                picture
              }
            }
          }
        }
        pageInfo {
          next
        }
      }
    }
  `;

  const headers: Record<string, string> = {
    'content-type': 'application/json'
  };

  if (lensApiKey) {
    headers['x-api-key'] = lensApiKey;
  }

  try {
    const response = await fetch(lensApiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        variables: {
          pageSize: limit <= 10 ? 'TEN' : 'FIFTY',
          cursor
        }
      }),
      cache: 'no-store'
    });

    const payload = await readBodySafely(response);

    if (!response.ok) {
      return {
        status: 'error',
        items: [],
        nextCursor: null,
        error: errorText(payload, `Lens request failed with status ${response.status}.`)
      };
    }

    const jsonPayload = payload as {
      data?: Record<string, unknown>;
      errors?: Array<{ message?: string }>;
    };

    if (Array.isArray(jsonPayload.errors) && jsonPayload.errors.length > 0) {
      const firstError = jsonPayload.errors[0]?.message || 'Unknown Lens GraphQL error.';
      return {
        status: 'error',
        items: [],
        nextCursor: null,
        error: firstError
      };
    }

    const root = jsonPayload.data || {};
    const posts = root.posts as Record<string, unknown> | undefined;
    const items = extractArray(posts || {}, [['items']]);

    const nextCandidate = (posts?.pageInfo as Record<string, unknown> | undefined)?.next;
    const nextCursor = typeof nextCandidate === 'string' && nextCandidate.trim()
      ? nextCandidate
      : null;

    return {
      status: 'ok',
      items,
      nextCursor,
      error: null
    };
  } catch (error) {
    return {
      status: 'error',
      items: [],
      nextCursor: null,
      error: error instanceof Error ? error.message : 'Unknown Lens error.'
    };
  }
}

export async function GET(request: NextRequest) {
  const limit = parseLimit(request.nextUrl.searchParams.get('limit'));
  const farcasterCursor = request.nextUrl.searchParams.get('cursorFarcaster');
  const lensCursor = request.nextUrl.searchParams.get('cursorLens');

  const [farcaster, lens] = await Promise.all([
    fetchFarcaster(limit, farcasterCursor),
    fetchLens(limit, lensCursor)
  ]);

  return NextResponse.json(
    {
      limit,
      fetchedAt: new Date().toISOString(),
      providers: {
        farcaster,
        lens
      }
    },
    { status: 200 }
  );
}
