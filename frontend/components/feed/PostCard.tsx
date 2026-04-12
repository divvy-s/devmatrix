"use client";
import { useState } from "react";
import { Post } from "@/lib/types";
import { AuthorInfo } from "./AuthorInfo";
import { PostContent } from "./PostContent";
import { PostMedia } from "./PostMedia";
import { PostTags } from "./PostTags";
import { MiniAppBlock } from "./MiniAppBlock";
import { LikeButton } from "./LikeButton";
import { CommentSection } from "./CommentSection";
import { TipButton } from "./TipButton";

export function PostCard({ post }: { post: Post }) {
  const [showComments, setShowComments] = useState(false);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition-colors flex flex-col gap-3 group">
      <AuthorInfo author={post.author} createdAt={post.createdAt} />
      
      <div className="pl-[2.75rem]">
        <PostContent content={post.content} />
        <PostMedia assets={post.assets} />
        <MiniAppBlock miniApp={post.miniApp} />
        <PostTags tags={post.tags} />
      </div>

      <div className="flex items-center gap-6 mt-1 pl-[2.75rem]">
        <LikeButton 
          postId={post.id} 
          initialLikes={post.likes} 
          initialLikedByMe={post.likedByMe} 
        />
        
        <button 
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12A9 9 0 113 12a9 9 0 0118 0z" />
          </svg>
          <span>{post.comments?.length || post.commentsCount}</span>
        </button>

        <div className="ml-auto">
          <TipButton authorId={post.author.id} username={post.author.username} />
        </div>
      </div>

      {showComments && (
        <CommentSection postId={post.id} initialComments={post.comments} />
      )}
    </div>
  );
}
