"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Heart, UserPlus, Zap, ShieldAlert, MessageSquare, CheckCircle2 } from "lucide-react";

const MOCK_NOTIFICATIONS = [
  { id: 1, type: "install", actor: "vitalik", time: "10m", text: "installed your mini-app CoffeeTip.", unread: true },
  { id: 2, type: "follow", actor: "0x_chad", time: "2h", text: "started following you.", unread: true },
  { id: 3, type: "like", actor: "alice", time: "4h", text: "liked your post.", unread: false },
  { id: 4, type: "mention", actor: "danny_dev", time: "1d", text: "mentioned you in a post.", unread: false },
  { id: 5, type: "system", actor: "CastKit", time: "2d", text: "Your app 'NFT Drop' has been approved for the verified registry.", unread: false },
];

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "install": return <Zap className="w-5 h-5 text-accent" />;
      case "follow": return <UserPlus className="w-5 h-5 text-primary" />;
      case "like": return <Heart className="w-5 h-5 text-red-500 fill-red-500" />;
      case "mention": return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case "system": return <ShieldAlert className="w-5 h-5 text-secondary" />;
      default: return <MessageSquare className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold mb-1">Notifications</h1>
        </div>
        <Button variant="outline" size="sm" onClick={markAllRead} className="h-9 border-border/50 text-muted-foreground hover:text-foreground">
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
          {notifications.map((notif) => (
            <div 
              key={notif.id} 
              className={`p-4 sm:p-5 flex items-start gap-4 hover:bg-card/30 transition-colors border-b border-border/20 last:border-0 ${notif.unread ? "bg-primary/5" : ""}`}
            >
              <div className="mt-1">
                {getIcon(notif.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-display font-medium text-[15px]">@{notif.actor}</span>
                  <span className="text-muted-foreground text-sm">{notif.text}</span>
                </div>
                <span className="text-xs text-muted-foreground font-mono">{notif.time} ago</span>
              </div>
              {notif.unread && (
                <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-2" />
              )}
            </div>
          ))}

          {notifications.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center">
               <div className="w-16 h-16 rounded-full bg-card border border-border/50 flex items-center justify-center mb-4">
                 <CheckCircle2 className="w-8 h-8 text-muted-foreground/50" />
               </div>
               <h3 className="font-display font-bold text-xl mb-2">You're all caught up!</h3>
               <p className="text-muted-foreground font-mono">No new notifications here.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
