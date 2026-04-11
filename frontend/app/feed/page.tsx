"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { MessageSquare, Heart, Repeat2, Share, BadgeCheck, Zap } from "lucide-react";

// Mock Data
const MOCK_POSTS = [
  {
    id: "p1",
    author: { name: "alice", handle: "alice.eth", avatar: "", isVerified: true },
    time: "2h",
    text: "Just built a new mini-app for tipping creators directly in your feed! Try it out below. 👇",
    miniApp: {
      type: "widget",
      id: "app_coffee",
      title: "Buy Creator a Coffee",
      icon: "☕",
      color: "text-primary bg-primary/10",
      action: "Connect to Tip"
    },
    stats: { likes: 142, replies: 12, reposts: 24 }
  },
  {
    id: "p2",
    author: { name: "bob_builder", handle: "bob.lens", avatar: "", isVerified: false },
    time: "5h",
    text: "Can't wait to see what people build on the new CastKit protocol. The sandboxing architecture is insane.",
    miniApp: null,
    stats: { likes: 58, replies: 2, reposts: 5 }
  },
  {
    id: "p3",
    author: { name: "art_gallery", handle: "gallery.eth", avatar: "", isVerified: true },
    time: "12h",
    text: "Dropping our new genesis collection today. Minting is live explicitly through our CastKit widget.",
    miniApp: {
      type: "widget",
      id: "app_mint",
      title: "Genesis NFT Mint",
      icon: "🎨",
      color: "text-secondary bg-secondary/10",
      action: "Mint for 0.05 ETH"
    },
    stats: { likes: 301, replies: 45, reposts: 89 }
  }
];

export default function FeedPage() {
  const [activeTab, setActiveTab] = useState("following");

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex gap-8">
        
        {/* MAIN FEED */}
        <div className="flex-1 max-w-2xl min-w-0">
          <Tabs defaultValue="following" className="w-full mb-6">
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

            <TabsContent value="following" className="mt-0">
              {/* Compose Box */}
              <div className="p-4 border-b border-border/40 flex gap-4 h-32">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex flex-shrink-0 items-center justify-center font-bold text-primary">
                  ME
                </div>
                <div className="flex-1">
                  <textarea 
                    placeholder="What's happening? /app to attach mini-app" 
                    className="w-full bg-transparent border-none outline-none resize-none h-16 text-lg placeholder:text-muted-foreground/70"
                  />
                  <div className="flex justify-between items-center border-t border-border/30 pt-3">
                    <div className="flex gap-2">
                       <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-primary hover:bg-primary/10 rounded-full">
                         <Zap className="w-4 h-4" />
                       </Button>
                    </div>
                    <Button size="sm" className="bg-primary text-primary-foreground font-mono rounded-full px-5 h-8">Post</Button>
                  </div>
                </div>
              </div>

              {/* Feed Posts */}
              <div className="flex flex-col">
                {MOCK_POSTS.map(post => (
                  <div key={post.id} className="p-5 border-b border-border/40 hover:bg-card/20 transition-colors">
                    <div className="flex gap-4">
                      {/* Avatar Side */}
                      <div className="w-10 h-10 rounded-full bg-secondary/20 flex-shrink-0 flex items-center justify-center font-bold text-secondary">
                        {post.author.name.substring(0,2).toUpperCase()}
                      </div>
                      
                      {/* Content Side */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold font-display">{post.author.name}</span>
                          {post.author.isVerified && <BadgeCheck className="w-4 h-4 text-primary fill-primary/20" />}
                          <span className="text-muted-foreground font-mono text-xs">@{post.author.handle}</span>
                          <span className="text-muted-foreground text-xs">·</span>
                          <span className="text-muted-foreground text-xs hover:underline cursor-pointer">{post.time}</span>
                        </div>
                        
                        {/* Text */}
                        <p className="text-foreground/90 whitespace-pre-wrap mb-4 leading-normal">
                          {post.text}
                        </p>

                        {/* Mini-App Inline Renderer */}
                        {post.miniApp && (
                          <div className="mb-4 rounded-xl border border-border/50 bg-[#0c0c0c] overflow-hidden">
                            <div className="bg-[#1a1a1a] px-3 py-2 border-b border-border/40 flex items-center gap-2">
                              <Zap className="w-3.5 h-3.5 text-primary" />
                              <span className="text-xs font-mono text-muted-foreground">Interactive App</span>
                            </div>
                            <div className="p-6">
                              <Card className="border-border/50 bg-background inset-shadow-sm p-5 text-center">
                                <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center text-xl ${post.miniApp.color}`}>
                                  {post.miniApp.icon}
                                </div>
                                <h4 className="font-display font-bold text-lg mb-4">{post.miniApp.title}</h4>
                                <Button className="w-full bg-white text-black hover:bg-white/90 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                                  {post.miniApp.action}
                                </Button>
                              </Card>
                            </div>
                          </div>
                        )}

                        {/* Action Bar */}
                        <div className="flex items-center justify-between text-muted-foreground max-w-md w-full">
                          <button className="flex items-center gap-2 hover:text-primary transition-colors group">
                            <div className="p-2 rounded-full group-hover:bg-primary/10">
                              <MessageSquare className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-mono">{post.stats.replies}</span>
                          </button>
                          
                          <button className="flex items-center gap-2 hover:text-green-500 transition-colors group">
                            <div className="p-2 rounded-full group-hover:bg-green-500/10">
                              <Repeat2 className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-mono">{post.stats.reposts}</span>
                          </button>
                          
                          <button className="flex items-center gap-2 hover:text-red-500 transition-colors group">
                            <div className="p-2 rounded-full group-hover:bg-red-500/10">
                              <Heart className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-mono">{post.stats.likes}</span>
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
