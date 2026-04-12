export interface Author {
  id: string;
  username: string;
  avatar: string;
}

export interface MiniApp {
  type: "internal" | "external";
  appId: string;
  label?: string;
  thumbnail?: string;
}

export interface Comment {
  id: string;
  author: Author;
  content: string;
  createdAt: string;
}

export interface Post {
  id: string;
  author: Author;
  content: string;
  assets: string[];
  miniApp?: MiniApp;
  tags: string[];
  likes: number;
  likedByMe: boolean;
  commentsCount: number;
  comments?: Comment[];
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  avatar: string;
  isFollowing: boolean;
  bio?: string;
}
