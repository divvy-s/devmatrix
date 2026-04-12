export class ApiError extends Error {
  code: string;
  statusCode: number;
  traceId: string;
  field?: string;

  constructor(message: string, code: string, statusCode: number, traceId: string, field?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = statusCode;
    this.traceId = traceId;
    this.field = field;
  }
}

export type PaginatedResponse<T> = {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type Author = {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};

export type Post = {
  id: string;
  content: string;
  createdAt: string;
  author: Author;
  likeCount: number;
  replyCount: number;
  repostCount: number;
  viewerContext?: ViewerContext;
};

export type ViewerContext = {
  liked: boolean;
  hasLiked?: boolean;
  reposted: boolean;
  bookmarked: boolean;
};

export type Me = {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  headerUrl: string | null;
  roles: string[];
};

export type Notification = {
  id: string;
  type: string;
  read: boolean;
  createdAt: string;
  actorId?: string | null;
  actor?: Author | null;
};

interface FetchOptions extends RequestInit {
  token?: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...init } = options;

  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.method !== "DELETE") {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 204) {
    return {} as T;
  }

  let data;
  const contentType = response.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorBody = typeof data === "object" && data !== null && "error" in data ? (data as any).error : null;
    if (errorBody) {
      throw new ApiError(
        errorBody.message || "Unknown API Error",
        errorBody.code || "UNKNOWN_ERROR",
        response.status,
        errorBody.trace_id || "",
        errorBody.field
      );
    }
    throw new ApiError(
      `HTTP Error ${response.status}: ${response.statusText}`,
      "HTTP_ERROR",
      response.status,
      ""
    );
  }

  return data as T;
}

export async function apiGet<T>(path: string, options?: Omit<FetchOptions, "method">) {
  return apiFetch<T>(path, { ...options, method: "GET" });
}

export async function apiPost<T>(path: string, options?: Omit<FetchOptions, "method">) {
  return apiFetch<T>(path, { ...options, method: "POST" });
}

export async function apiDelete<T>(path: string, options?: Omit<FetchOptions, "method">) {
  return apiFetch<T>(path, { ...options, method: "DELETE" });
}

import { Post as FeedPost, User as FeedUser, MiniApp } from "./types";

export async function getFeed(): Promise<FeedPost[]> {
  const res = await fetch("/api/feed");
  if (!res.ok) throw new Error("Failed to fetch feed");
  return res.json();
}

export async function createPost(data: {
  title?: string;
  content: string;
  mediaIds?: string[];
  tags?: string[];
  appId?: string;
}, token?: string | null): Promise<void> {
  return apiPost<void>("/api/post", { body: JSON.stringify(data), token });
}

export async function likePost(postId: string, token?: string | null): Promise<void> {
  return apiPost<void>("/api/like", { body: JSON.stringify({ postId }), token });
}

export async function addComment(postId: string, content: string, token?: string | null): Promise<void> {
  return apiPost<void>("/api/comment", { body: JSON.stringify({ postId, content }), token });
}

export async function searchUsers(query: string, token?: string | null): Promise<FeedUser[]> {
  return apiGet<FeedUser[]>(`/api/users/search?q=${encodeURIComponent(query)}`, { token });
}

export async function toggleFollow(userId: string, token?: string | null): Promise<void> {
  return apiPost<void>("/api/follow", { body: JSON.stringify({ userId }), token });
}

export async function triggerMiniAppAction(
  appId: string,
  action: string,
  payload?: Record<string, unknown>,
  token?: string | null
): Promise<void> {
  return apiPost<void>(`/api/miniapp/${appId}/action`, { body: JSON.stringify({ action, payload }), token });
}

export async function uploadMedia(file: File, token?: string | null): Promise<{ id: string; url: string; status: string }> {
  const formData = new FormData();
  formData.append("file", file);
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
  
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  const response = await fetch(`${API_URL}/api/media/upload`, {
    method: "POST",
    body: formData,
    headers,
  });

  if (!response.ok) {
    throw new Error("Media upload failed");
  }

  return response.json();
}
