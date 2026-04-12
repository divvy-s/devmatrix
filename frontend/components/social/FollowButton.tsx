"use client";
import { useOptimistic, useTransition, useState } from "react";
import { toggleFollow } from "@/lib/api";

export function FollowButton({ userId, initialIsFollowing }: { userId: string, initialIsFollowing: boolean }) {
  const [actualFollowing, setActualFollowing] = useState(initialIsFollowing);
  
  const [optimisticFollowing, addOptimisticFollowing] = useOptimistic(
    actualFollowing,
    (_, newFollowing: boolean) => newFollowing
  );

  const [isPending, startTransition] = useTransition();

  const handleToggle = async () => {
    const newFollowing = !actualFollowing;
    
    startTransition(() => {
      addOptimisticFollowing(newFollowing);
    });

    try {
      await toggleFollow(userId);
      setActualFollowing(newFollowing);
    } catch {
      console.error("Failed to follow user");
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors border ${
        optimisticFollowing 
          ? "border-purple-500 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20" 
          : "border-zinc-600 text-zinc-300 hover:border-zinc-400"
      }`}
    >
      {optimisticFollowing ? "Following" : "Follow"}
    </button>
  );
}
