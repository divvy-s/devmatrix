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
