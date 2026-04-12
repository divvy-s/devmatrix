import { FeedPage } from "@/components/feed/FeedPage";
import { UserSearchBar } from "@/components/social/UserSearchBar";
import { getFeed } from "@/lib/api";
import { rankPosts } from "@/lib/rankPosts";
import { Post } from "@/lib/types";
import { CreatePostFAB } from "@/components/feed/CreatePostFAB";

export default async function Page() {
  let initialPosts: Post[] = [];
  try {
    const rawFeed = await getFeed();
    initialPosts = rankPosts(rawFeed);
  } catch (err) {
    // Graceful fallback if static/server fetch fails
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center">
      <header className="w-full max-w-2xl border-b border-zinc-800 p-4 sticky top-0 bg-zinc-950/80 backdrop-blur z-20 flex justify-between items-center">
        <h1 className="text-xl font-bold text-zinc-100 uppercase tracking-tighter">Global Feed</h1>
        <UserSearchBar />
      </header>
      <div className="w-full max-w-2xl py-6 px-4">
        <FeedPage initialPosts={initialPosts} />
      </div>
      <CreatePostFAB />
    </main>
  );
}
