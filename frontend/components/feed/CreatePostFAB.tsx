"use client";
import { useState, useRef } from "react";
import { createPost, uploadMedia } from "@/lib/api";
import { LoadingSpinner } from "../shared/LoadingSpinner";
import { useBackendToken } from "@/hooks/use-api";
import { useMyApps } from "@/hooks/use-apps";

export function CreatePostFAB() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [appId, setAppId] = useState("");
  const [loading, setLoading] = useState(false);
  const [mediaIds, setMediaIds] = useState<string[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const token = useBackendToken();
  const { data: myAppsData } = useMyApps();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setMediaPreviews((prev) => [...prev, localUrl]);

    try {
      const res = await uploadMedia(file, token);
      setMediaIds((prev) => [...prev, res.id]);
    } catch {
      console.error("Failed to upload file");
      setMediaPreviews((prev) => prev.filter((u) => u !== localUrl));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || loading) return;

    setLoading(true);
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);

    try {
      await createPost({
        content,
        title: title.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        appId: appId.trim() || undefined,
        mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
      }, token);
      setTitle("");
      setContent("");
      setTagsInput("");
      setAppId("");
      setMediaIds([]);
      setMediaPreviews([]);
      setOpen(false);
      window.location.reload();
    } catch {
      console.error("Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-purple-600 hover:bg-purple-500 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-50"
        title="Create Post"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-zinc-100">Create Post</h2>
              <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post Title (Optional)"
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's happening?"
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 min-h-[120px] resize-none"
                autoFocus
              />
              
              {mediaPreviews.length > 0 && (
                <div className="flex gap-2 overflow-x-auto py-2">
                  {mediaPreviews.map((src, i) => (
                    <img key={i} src={src} className="w-20 h-20 object-cover rounded-xl border border-zinc-700" alt="Preview" />
                  ))}
                </div>
              )}

              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Tags (comma separated)"
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
              />
              
              <select
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-purple-500"
              >
                <option value="">Attach Mini-App (Optional)</option>
                {myAppsData?.pages.flatMap(p => p.data).map(app => (
                  <option key={app.id} value={app.id}>
                    {app.name}
                  </option>
                ))}
              </select>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <div className="flex items-center gap-2">
                  <input 
                    type="file" 
                    accept="image/*,video/mp4" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                  />
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-purple-500 hover:bg-purple-500/10 rounded-full transition-colors"
                    title="Add Media"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!content.trim() || loading}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-full transition-colors flex items-center justify-center min-w-[100px]"
                >
                  {loading ? <LoadingSpinner size="sm" /> : "Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
