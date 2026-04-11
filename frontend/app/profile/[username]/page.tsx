"use client";

import { use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Icons } from "@/components/global/icons";
import { MapPin, Link as LinkIcon, CheckCircle2, MessageSquare, Plus } from "lucide-react";
import { useFollowers, useFollowing, useFollow } from "@/hooks/use-social";

export default function ExternalProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);

  const { data: followersData } = useFollowers(username);
  const { data: followingData } = useFollowing(username);
  const { mutate: toggleFollow } = useFollow();
  const followersCount = followersData?.pages[0]?.data?.length || 0;
  const followingCount = followingData?.pages[0]?.data?.length || 0;

  return (
    <div className="flex flex-col min-h-screen">
      <div className="w-full h-48 md:h-64 bg-gradient-to-r from-primary/20 via-black to-secondary/20 relative">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-50" />
      </div>

      <div className="container mx-auto px-4 max-w-5xl -mt-16 sm:-mt-20 relative z-10">
        
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 h-full">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-background bg-card flex flex-shrink-0 items-center justify-center text-4xl font-display font-bold uppercase shadow-2xl relative overflow-hidden">
              {username.substring(0,2)}
              <div className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-background border-2 border-background flex items-center justify-center">
                 <CheckCircle2 className="text-primary w-5 h-5 fill-primary/20" />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-10 border-border/50 text-muted-foreground w-12 rounded-full px-0">
              <MessageSquare className="w-4 h-4" />
            </Button>
            <Button onClick={() => toggleFollow({ username, action: 'follow' })} size="sm" className="h-10 px-6 font-mono font-bold bg-white text-black hover:bg-gray-200 rounded-full">
              Follow
            </Button>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="font-display font-bold text-3xl">@{username}</h1>
          <p className="text-muted-foreground font-mono text-sm mb-4">0xUnknown</p>
          
          <p className="max-w-2xl text-foreground/90 leading-relaxed mb-4">
            Developer traversing the intersection of DeFi and Social graphs.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6 font-mono">
            <span className="flex items-center gap-1.5 hover:text-primary cursor-pointer"><MapPin className="w-4 h-4" /> Unknown</span>
            <span className="flex items-center gap-1.5 hover:text-primary cursor-pointer"><Icons.gitHub className="w-4 h-4" /> github.com/{username}</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex gap-1.5"><strong className="font-display text-lg">{followersCount}</strong> <span className="text-muted-foreground text-sm flex items-center">Followers</span></div>
            <div className="flex gap-1.5"><strong className="font-display text-lg">{followingCount}</strong> <span className="text-muted-foreground text-sm flex items-center">Following</span></div>
            <div className="flex gap-1.5"><strong className="font-display text-lg">0</strong> <span className="text-muted-foreground text-sm flex items-center">App Installs</span></div>
          </div>
        </div>

        <Tabs defaultValue="miniapps" className="w-full">
          <TabsList className="w-full justify-start border-b border-border/40 rounded-none bg-transparent p-0 h-auto gap-6 mb-8">
            <TabsTrigger value="posts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 py-3 font-display font-medium text-lg tracking-wide bg-transparent text-muted-foreground transition-all">
              Posts
            </TabsTrigger>
            <TabsTrigger value="miniapps" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 py-3 font-display font-medium text-lg tracking-wide bg-transparent text-muted-foreground transition-all">
              Mini-Apps <Badge className="ml-2 bg-primary/20 text-primary border-none">0</Badge>
            </TabsTrigger>
            <TabsTrigger value="nfts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 py-3 font-display font-medium text-lg tracking-wide bg-transparent text-muted-foreground transition-all">
              NFTs
            </TabsTrigger>
            <TabsTrigger value="activity" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 py-3 font-display font-medium text-lg tracking-wide bg-transparent text-muted-foreground transition-all">
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="miniapps" className="mt-0">
             <div className="p-8 border border-border/40 rounded-xl bg-[#0c0c0c] text-center text-muted-foreground font-mono">
               No public mini-apps explicitly registered yet.
             </div>
          </TabsContent>

          <TabsContent value="posts" className="mt-0">
            <div className="p-8 border border-border/40 rounded-xl bg-[#0c0c0c] text-center text-muted-foreground font-mono">
              No recent posts found.
            </div>
          </TabsContent>
          <TabsContent value="nfts" className="mt-0">
            <div className="p-8 border border-border/40 rounded-xl bg-[#0c0c0c] text-center text-muted-foreground font-mono">
              NFT Gallery coming soon.
            </div>
          </TabsContent>
          <TabsContent value="activity" className="mt-0">
            <div className="p-8 border border-border/40 rounded-xl bg-[#0c0c0c] text-center text-muted-foreground font-mono">
              No recent activity found.
            </div>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
