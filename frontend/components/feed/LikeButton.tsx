"use client";
import { useOptimistic, useTransition, useState } from "react";
import { likePost } from "@/lib/api";

interface LikeButtonProps {
  postId: string;
  initialLikes: number;
  initialLikedByMe: boolean;
}

export function LikeButton({ postId, initialLikes, initialLikedByMe }: LikeButtonProps) {
  const [actualLikes, setActualLikes] = useState(initialLikes);
  const [actualLiked, setActualLiked] = useState(initialLikedByMe);
  
  const [optimisticState, addOptimisticState] = useOptimistic(
    { likes: actualLikes, likedByMe: actualLiked },
    (state, newLiked: boolean) => ({
      likes: state.likes + (newLiked ? 1 : -1),
      likedByMe: newLiked
    })
  );

  const [isPending, startTransition] = useTransition();

  const handleToggle = async () => {
    const newLiked = !actualLiked;
    startTransition(() => {
      addOptimisticState(newLiked);
    });

    try {
      await likePost(postId);
      setActualLikes(prev => prev + (newLiked ? 1 : -1));
      setActualLiked(newLiked);
    } catch {
      console.error("Failed to like post");
    }
  };

  return (
    <button 
      onClick={handleToggle}
      disabled={isPending}
      className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
        optimisticState.likedByMe 
          ? "text-red-500 hover:text-red-400" 
          : "text-zinc-400 hover:text-red-400"
      }`}
    >
      <svg
        className="w-5 h-5 transition-all"
        fill={optimisticState.likedByMe ? "currentColor" : "none"}
        stroke="currentColor" 
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
      <span>{optimisticState.likes}</span>
    </button>
  );
}
