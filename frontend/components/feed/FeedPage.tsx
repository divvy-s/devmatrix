"use client";
import { useState, useEffect } from "react";
import { Post } from "@/lib/types";
import { getFeed } from "@/lib/api";
import { rankPosts } from "@/lib/rankPosts";
import { PostCard } from "./PostCard";
import { PostCardSkeleton } from "./PostCardSkeleton";

export function FeedPage({ initialPosts }: { initialPosts?: Post[] }) {
  const [posts, setPosts] = useState<Post[]>(initialPosts || []);
  const [loading, setLoading] = useState(!initialPosts);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPosts) return;

    let mounted = true;
    getFeed()
      .then(data => {
        if (mounted) {
          setPosts(rankPosts(data));
        }
      })
      .catch(e => {
        if (mounted) setError("Failed to load feed");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
      
    return () => { mounted = false; };
  }, [initialPosts]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 mx-auto w-full">
        <PostCardSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-400 p-8">{error}</div>;
  }

  if (posts.length === 0) {
    return <div className="text-center text-zinc-500 p-8">No posts in your feed</div>;
  }

  return (
    <div className="flex flex-col gap-4 mx-auto w-full">
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
      <div className="pt-4 pb-8 flex justify-center">
        <button className="text-zinc-400 font-medium text-sm hover:text-zinc-200 border border-zinc-800 rounded-full px-6 py-2 transition-colors">
          Load more
        </button>
      </div>
    </div>
  );
}
