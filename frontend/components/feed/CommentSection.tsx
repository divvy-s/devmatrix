"use client";
import { useState } from "react";
import { Comment } from "@/lib/types";
import { addComment } from "@/lib/api";
import { Avatar } from "../shared/Avatar";

export function CommentSection({ postId, initialComments = [] }: { postId: string, initialComments?: Comment[] }) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const newContent = input;
    setInput("");
    setLoading(true);

    const tempComment: Comment = {
      id: Math.random().toString(),
      content: newContent,
      createdAt: new Date().toISOString(),
      author: { id: "me", username: "current_user", avatar: "" }
    };
    setComments(prev => [...prev, tempComment]);

    try {
      await addComment(postId, newContent);
    } catch {
      setComments(prev => prev.filter(c => c.id !== tempComment.id));
      setInput(newContent);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-zinc-800/80 flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {comments.length === 0 ? (
          <span className="text-zinc-500 text-sm text-center italic">No comments yet</span>
        ) : (
          comments.map(c => (
            <div key={c.id} className="flex gap-2">
              <Avatar src={c.author.avatar} alt={c.author.username} size="sm" />
              <div className="flex flex-col bg-zinc-800/50 rounded-xl rounded-tl-sm px-3 py-2 text-sm max-w-[90%]">
                <span className="font-semibold text-zinc-300">{c.author.username}</span>
                <span className="text-zinc-200">{c.content}</span>
              </div>
            </div>
          ))
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
        <Avatar alt="current_user" size="sm" />
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-full px-4 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 focus:bg-zinc-700/50 transition-colors"
        />
        <button 
          type="submit" 
          disabled={!input.trim() || loading}
          className="text-purple-400 font-medium text-sm px-2 disabled:opacity-50"
        >
          Post
        </button>
      </form>
    </div>
  );
}
