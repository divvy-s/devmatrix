"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { MessageSquare, Heart, Repeat2, Share, BadgeCheck, Zap, AlertCircle } from "lucide-react";
import { useFeed, useLikePost, useRepost, useCreatePost } from "@/hooks/use-feed";

export default function FeedPage() {
  const [activeTab, setActiveTab] = useState("following");
  const [composeText, setComposeText] = useState("");

  const followingFeed = useFeed("following");
  const discoverFeed = useFeed("discovery");
  const trendingFeed = useFeed("trending");

  const getActiveFeed = () => {
    if (activeTab === "discover") return discoverFeed;
    if (activeTab === "trending") return trendingFeed;
    return followingFeed;
  };

  const feed = getActiveFeed();
  const posts = feed.data?.pages.flatMap((p) => p.data) ?? [];

  const { mutate: likePost } = useLikePost();
  const { mutate: repostPost } = useRepost();
  const { mutate: createPost, isPending: isCreatingPost } = useCreatePost();

  const handlePost = () => {
    if (!composeText || composeText.trim().length === 0 || composeText.length > 500 || isCreatingPost) return;
    createPost(composeText, {
      onSuccess: () => setComposeText(""),
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex gap-8">
        
        {/* MAIN FEED */}
        <div className="flex-1 max-w-2xl min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
            <TabsList className="w-full justify-start border-b border-border/40 rounded-none bg-transparent p-0 h-auto gap-6">
              <TabsTrigger value="following" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 py-3 font-display font-medium text-lg tracking-wide bg-transparent">
                Following
              </TabsTrigger>
              <TabsTrigger value="discover" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 py-3 font-display font-medium text-lg tracking-wide bg-transparent">
                Discover
              </TabsTrigger>
              <TabsTrigger value="trending" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 py-3 font-display font-medium text-lg tracking-wide bg-transparent">
                Trending
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              {/* Compose Box */}
              <div className="p-4 border-b border-border/40 flex gap-4 h-32">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex flex-shrink-0 items-center justify-center font-bold text-primary">
                  ME
                </div>
                <div className="flex-1">
                  <textarea 
                    placeholder="What's happening? /app to attach mini-app" 
                    className="w-full bg-transparent border-none outline-none resize-none h-16 text-lg placeholder:text-muted-foreground/70"
                    value={composeText}
                    onChange={(e) => setComposeText(e.target.value)}
                  />
                  <div className="flex justify-between items-center border-t border-border/30 pt-3">
                    <div className="flex gap-2">
                       <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-primary hover:bg-primary/10 rounded-full">
                         <Zap className="w-4 h-4" />
                       </Button>
                    </div>
                    <Button 
                      size="sm" 
                      className="bg-primary text-primary-foreground font-mono rounded-full px-5 h-8 disabled:opacity-50"
                      onClick={handlePost}
                      disabled={isCreatingPost || composeText.trim().length === 0 || composeText.length > 500}
                    >
                      {isCreatingPost ? "Posting..." : "Post"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Feed Posts */}
              <div className="flex flex-col">
                {feed.isPending ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-5 border-b border-border/40 flex gap-4 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-secondary/20 flex-shrink-0" />
                      <div className="flex-1 space-y-4 py-1">
                        <div className="h-4 bg-secondary/20 rounded w-1/4" />
                        <div className="space-y-2">
                          <div className="h-4 bg-secondary/20 rounded" />
                          <div className="h-4 bg-secondary/20 rounded w-5/6" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : feed.isError ? (
                  <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                    <AlertCircle className="w-8 h-8 text-destructive mb-2" />
                    <p className="mb-4">Failed to load feed.</p>
                    <Button variant="outline" onClick={() => feed.refetch()}>Try again</Button>
                  </div>
                ) : posts.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Nothing here yet.
                  </div>
                ) : (
                  <>
                    {posts.map(post => (
                      <div key={post.id} className="p-5 border-b border-border/40 hover:bg-card/20 transition-colors">
                        <div className="flex gap-4">
                          {/* Avatar Side */}
                          <div className="w-10 h-10 rounded-full bg-secondary/20 flex-shrink-0 flex items-center justify-center font-bold text-secondary overflow-hidden">
                            {(post.author.avatarUrl || (post.author as any).profile?.avatarUrl) ? (
                              <img src={post.author.avatarUrl || (post.author as any).profile?.avatarUrl} alt={post.author.username} className="w-full h-full object-cover" />
                            ) : (
                              post.author.username.substring(0,2).toUpperCase()
                            )}
                          </div>
                          
                          {/* Content Side */}
                          <div className="flex-1 min-w-0">
                            {/* Header */}
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold font-display">{post.author.displayName || post.author.username}</span>
                              {(post.author as any).roles?.includes("verified") && <BadgeCheck className="w-4 h-4 text-primary fill-primary/20" />}
                              <span className="text-muted-foreground font-mono text-xs">@{post.author.username}</span>
                              <span className="text-muted-foreground text-xs">·</span>
                              <span className="text-muted-foreground text-xs hover:underline cursor-pointer">{new Date(post.createdAt || Date.now()).toLocaleDateString()}</span>
                            </div>
                            
                            {/* Text */}
                            <p className="text-foreground/90 whitespace-pre-wrap mb-4 leading-normal">
                              {post.content}
                            </p>

                            {/* TODO: miniApp renderer */}

                            {/* Action Bar */}
                            <div className="flex items-center justify-between text-muted-foreground max-w-md w-full">
                              <button className="flex items-center gap-2 hover:text-primary transition-colors group">
                                <div className="p-2 rounded-full group-hover:bg-primary/10">
                                  <MessageSquare className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-mono">{post.replyCount}</span>
                              </button>
                              
                              <button 
                                onClick={() => !post.viewerContext?.reposted && repostPost(post.id)}
                                className={`flex items-center gap-2 transition-colors group ${post.viewerContext?.reposted ? "text-green-500" : "hover:text-green-500"}`}
                              >
                                <div className={`p-2 rounded-full ${post.viewerContext?.reposted ? "bg-green-500/10" : "group-hover:bg-green-500/10"}`}>
                                  <Repeat2 className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-mono">{post.repostCount}</span>
                              </button>
                              
                              <button 
                                onClick={() => !post.viewerContext?.hasLiked && !post.viewerContext?.liked && likePost(post.id)}
                                className={`flex items-center gap-2 transition-colors group ${post.viewerContext?.hasLiked || post.viewerContext?.liked ? "text-red-500" : "hover:text-red-500"}`}
                              >
                                <div className={`p-2 rounded-full ${post.viewerContext?.hasLiked || post.viewerContext?.liked ? "bg-red-500/10" : "group-hover:bg-red-500/10"}`}>
                                  <Heart className={`w-4 h-4 ${post.viewerContext?.hasLiked || post.viewerContext?.liked ? "fill-red-500" : ""}`} />
                                </div>
                                <span className="text-xs font-mono">{post.likeCount}</span>
                              </button>
                              
                              <button className="flex items-center gap-2 hover:text-primary transition-colors group">
                                <div className="p-2 rounded-full group-hover:bg-primary/10">
                                  <Share className="w-4 h-4" />
                                </div>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {feed.hasNextPage && (
                      <div className="p-4 flex justify-center">
                        <Button 
                          variant="outline" 
                          onClick={() => feed.fetchNextPage()}
                          disabled={feed.isFetchingNextPage}
                        >
                          {feed.isFetchingNextPage ? "Loading more..." : "Load more"}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="hidden lg:flex flex-col w-80 gap-6 shrink-0 relative">
          <div className="sticky top-24 gap-6 flex flex-col">
            
            {/* AI Recommendations */}
            <div className="p-5 rounded-2xl border border-border/50 bg-[#0c0c0c]">
              <h3 className="font-display font-bold text-base mb-4">Recommended Mini-Apps</h3>
              <div className="flex flex-col gap-4">
                {[
                  { name: "Gas Fetcher", icon: "⛽", color: "text-blue-500 bg-blue-500/10" },
                  { name: "DM Unlocker", icon: "🔒", color: "text-accent bg-accent/10" },
                  { name: "FlappyEth", icon: "🕹️", color: "text-green-500 bg-green-500/10" }
                ].map((app, i) => (
                  <div key={i} className="flex flex-col gap-2 p-3 rounded-xl hover:bg-card/40 border border-transparent hover:border-border/50 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 transition-transform group-hover:scale-110 ${app.color}`}>
                        {app.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">{app.name}</div>
                        <div className="text-xs text-muted-foreground">Add to post</div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground group-hover:text-primary">
                        +
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trending Creators */}
            <div className="p-5 rounded-2xl border border-border/50 bg-[#0c0c0c]">
              <h3 className="font-display font-bold text-base mb-4">Suggested Follows</h3>
              <div className="flex flex-col gap-4">
                {[{ username: "vitalik.eth", tag: "Founder" }, { username: "dfohub", tag: "DAO" }].map(user => (
                  <div key={user.username} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-border flex items-center justify-center font-bold text-xs uppercase text-foreground">
                        {user.username.substring(0,2)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">@{user.username}</span>
                        <span className="text-xs text-muted-foreground font-mono">{user.tag}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="h-8 rounded-full border-border/50 text-xs px-3 hover:bg-primary/10 hover:text-primary hover:border-primary/50">Follow</Button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
