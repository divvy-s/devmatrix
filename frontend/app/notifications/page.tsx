"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Heart, UserPlus, Zap, ShieldAlert, MessageSquare, CheckCircle2, AlertCircle } from "lucide-react";
import { useNotifications, useMarkAllRead } from "@/hooks/use-notifications";

function getIcon(type: string) {
  switch (type) {
    case "install": return <Zap className="w-5 h-5 text-accent" />;
    case "follow": return <UserPlus className="w-5 h-5 text-primary" />;
    case "like": return <Heart className="w-5 h-5 text-red-500 fill-red-500" />;
    case "mention": return <MessageSquare className="w-5 h-5 text-blue-500" />;
    case "system": return <ShieldAlert className="w-5 h-5 text-secondary" />;
    default: return <MessageSquare className="w-5 h-5 text-muted-foreground" />;
  }
}

function getTextForType(type: string) {
  switch(type) {
    case "install": return "installed your mini-app.";
    case "follow": return "started following you.";
    case "like": return "liked your post.";
    case "mention": return "mentioned you in a post.";
    case "reply": return "replied to your post.";
    case "repost": return "reposted your post.";
    case "system": return "System notification.";
    default: return "interacted with you.";
  }
}

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const { data, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotifications();
  const { mutate: markAllRead } = useMarkAllRead();

  const notifications = data?.pages.flatMap(p => p.data) || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold mb-1">Notifications</h1>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => markAllRead()} 
          className="h-9 border-border/50 text-muted-foreground hover:text-foreground"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" /> Mark all read
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full overflow-x-auto justify-start border-b border-border/40 rounded-none bg-transparent p-0 h-auto gap-4 mb-6">
          {["All", "Follows", "Mentions", "App Activity", "System"].map(tab => (
            <TabsTrigger 
              key={tab} 
              value={tab.toLowerCase().replace(" ", "")} 
              className="rounded-none whitespace-nowrap border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3 font-mono text-sm tracking-wide bg-transparent"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="mt-0 space-y-1">
          {isPending ? (
             Array.from({ length: 3 }).map((_, i) => (
               <div key={i} className="p-5 border-b border-border/40 flex gap-4 animate-pulse">
                 <div className="w-10 h-10 rounded-full bg-secondary/20 flex-shrink-0" />
                 <div className="flex-1 space-y-4 py-1">
                   <div className="h-4 bg-secondary/20 rounded w-1/4" />
                   <div className="h-4 bg-secondary/20 rounded w-5/6" />
                 </div>
               </div>
             ))
          ) : isError ? (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
              <AlertCircle className="w-8 h-8 text-destructive mb-2" />
              <p className="mb-4">Failed to load notifications.</p>
              <Button variant="outline" onClick={() => refetch()}>Try again</Button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
               <div className="w-16 h-16 rounded-full bg-card border border-border/50 flex items-center justify-center mb-4">
                 <CheckCircle2 className="w-8 h-8 text-muted-foreground/50" />
               </div>
               <h3 className="font-display font-bold text-xl mb-2">You're all caught up!</h3>
               <p className="text-muted-foreground font-mono">No new notifications here.</p>
            </div>
          ) : (
            <>
              {notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-4 sm:p-5 flex items-start gap-4 hover:bg-card/30 transition-colors border-b border-border/20 last:border-0 ${!notif.read ? "bg-primary/5" : ""}`}
                >
                  <div className="mt-1">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-display font-medium text-[15px]">@{notif.actor?.username || "System"}</span>
                      <span className="text-muted-foreground text-sm">{getTextForType(notif.type)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">{new Date(notif.createdAt).toLocaleDateString()}</span>
                  </div>
                  {!notif.read && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-2" />
                  )}
                </div>
              ))}
              {hasNextPage && (
                <div className="p-4 flex justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? "Loading more..." : "Load more"}
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
