import { Post } from "@/lib/types";

export const FAKE_FEED: Post[] = [
  {
    id: "post-1",
    author: { id: "u-1", username: "vitalik", avatar: "" },
    content: "Just shipped v2 of the protocol! #ethereum #scaling",
    assets: [],
    tags: ["ethereum", "scaling"],
    likes: 1240,
    likedByMe: true,
    commentsCount: 42,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "post-2",
    author: { id: "u-2", username: "builder_bob", avatar: "" },
    content: "Check out this new mini-app I built. It integrates directly with your wallet and lets you swap right in the feed.",
    assets: ["https://picsum.photos/seed/post2/600/400"],
    miniApp: { type: "internal", appId: "dex_swapper", label: "Swap Tokens" },
    tags: ["defi"],
    likes: 56,
    likedByMe: false,
    commentsCount: 3,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "post-3",
    author: { id: "u-3", username: "design_queen", avatar: "" },
    content: "Farcaster clients are getting better every day. I'm loving the sheer amount of experimentation happening in the ecosystem right now. Here's a quick mockup of what I'm working on. It's a long post so you might need to expand it to understand everything I'm talking about here. #design #ui",
    assets: ["https://picsum.photos/seed/post3a/400/400", "https://picsum.photos/seed/post3b/400/400"],
    tags: ["design", "ui"],
    likes: 89,
    likedByMe: false,
    commentsCount: 12,
    createdAt: new Date(Date.now() - 14400000).toISOString(),
  }
];
