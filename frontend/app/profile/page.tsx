"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  Users, UserCheck, Package, Star, TrendingUp, Download,
  MapPin, Link2, Calendar, Settings, Activity,
  Zap, ArrowUpRight,
  BarChart3, Globe, AtSign, GitBranch
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMyApps } from "@/hooks/use-apps";
import { useFollowers, useFollowing, useFollow } from "@/hooks/use-social";
import { useNotifications } from "@/hooks/use-notifications";

const TABS = ["Apps", "Activity", "Followers", "Following"] as const;
type Tab = typeof TABS[number];

function StatPill({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl border border-border/40 bg-card/30 hover:bg-card/60 transition-all cursor-default group">
      <Icon className={`w-4 h-4 ${color} group-hover:scale-110 transition-transform`} />
      <div className="text-xl sm:text-2xl font-black font-display">{value}</div>
      <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{label}</div>
    </div>
  );
}

function UserGrid({ users }: { users: any[] }) {
  if (users.length === 0) return <p className="text-xs text-muted-foreground">Nothing to see here.</p>;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {users.map((u) => (
        <motion.div
           key={u.id}
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card/30 hover:bg-card/60 hover:border-primary/30 transition-all cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-xs font-black uppercase text-foreground shrink-0 overflow-hidden group-hover:border-primary/50 transition-colors">
            {u.avatarUrl ? <img src={u.avatarUrl} alt={u.username} className="w-full h-full object-cover" /> : u.username.substring(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">@{u.username}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function AppCard({ app }: { app: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="group glass border border-border/40 hover:border-primary/30 rounded-2xl p-5 cursor-pointer hover:scale-[1.02] transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-card border border-border/50 flex items-center justify-center text-xl font-bold uppercase group-hover:scale-110 transition-transform duration-300">
            {app.name.substring(0, 1)}
          </div>
          <div>
            <h3 className="font-display font-black text-sm">{app.name}</h3>
            <Badge variant="outline" className="text-[9px] font-mono mt-0.5 border-border/50 text-muted-foreground">
              {app.type || "Default"}
            </Badge>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary">
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-4">{app.description}</p>
      <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
        <span className="flex items-center gap-1"><Download className="w-3 h-3" />{app.installs || 0}</span>
        <span className="flex items-center gap-1 text-yellow-400"><Star className="w-3 h-3" />{app.stars || 0}</span>
      </div>
    </motion.div>
  );
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("Apps");
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const username = session?.user?.name || "";
  const { data: followersData } = useFollowers(username);
  const { data: followingData } = useFollowing(username);
  const { data: myAppsData } = useMyApps();
  const { data: notificationsData } = useNotifications();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const followers = followersData?.pages.flatMap(p => p.data) || [];
  const followList = followingData?.pages.flatMap(p => p.data) || [];
  const myApps = myAppsData?.pages.flatMap(p => p.data) || [];
  const activityFeed = notificationsData?.pages.flatMap(p => p.data) || [];
  const user = session?.user;

  return (
    <div className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/4 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-accent/4 rounded-full blur-[100px]" />
      </div>

      {/* Cover Banner */}
      <div className="relative h-48 sm:h-64 w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10" />
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(0,255,136,0.08) 0%, transparent 60%),
                            radial-gradient(circle at 80% 50%, rgba(139,92,246,0.08) 0%, transparent 60%)`,
        }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
          backgroundSize: "40px 40px"
        }} />
        <div className="absolute top-4 right-4 flex gap-2">
          <Link href="/dashboard">
            <Button variant="default" size="sm" className="h-8 text-[11px] uppercase tracking-wider font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(0,255,136,0.3)] transition-all">
              <BarChart3 className="w-3 h-3 mr-1.5" />Dashboard
            </Button>
          </Link>
          <Button variant="outline" size="sm" className="h-8 text-[11px] uppercase tracking-wider border-white/10 bg-black/20 backdrop-blur-md hover:bg-white/10 transition-all">
            <Settings className="w-3 h-3 mr-1.5" />Edit Profile
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 max-w-5xl">
        <div className="relative -mt-14 sm:-mt-16 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="relative inline-block">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-4 border-background overflow-hidden bg-card ring-2 ring-primary/20">
                {user?.image ? (
                  <Image src={user.image} alt="Profile" width={112} height={112} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-3xl font-black text-foreground uppercase">
                    {user?.name?.substring(0, 2) || "U"}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary border-2 border-background flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-primary-foreground" />
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-3">
              <Button
                size="sm"
                onClick={() => setFollowing(f => !f)}
                className={`h-9 text-xs font-mono transition-all ${following
                    ? "bg-muted text-muted-foreground border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                  }`}
              >
                {following ? <><UserCheck className="w-3 h-3 mr-1.5" />Following</> : <><Users className="w-3 h-3 mr-1.5" />Follow</>}
              </Button>
            </div>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight">{user?.name || "Developer"}</h1>
            <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px] font-mono">
              <Zap className="w-2.5 h-2.5 mr-1" />Verified Builder
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground font-mono mb-3">
            @{user?.name?.toLowerCase().replace(/\s+/g, "_") || "developer"} · {user?.email || ""}
          </p>
          <p className="text-sm text-foreground/80 max-w-lg leading-relaxed mb-4">
            Building the future of social Web3 mini-apps. Shipping fast, staying onchain.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-mono">
            <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" />Remote · Web3</span>
            <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" />Joined {new Date().getFullYear()}</span>
          </div>

          <div className="flex items-center gap-2 mt-4">
             <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"><AtSign className="h-3.5 w-3.5" /></Button>
             <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"><GitBranch className="h-3.5 w-3.5" /></Button>
             <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"><Globe className="h-3.5 w-3.5" /></Button>
             <Button size="sm" onClick={() => setFollowing(f => !f)} className={`sm:hidden ml-auto h-8 text-xs font-mono transition-all ${following ? "bg-muted text-muted-foreground border border-border" : "bg-primary text-primary-foreground shadow-lg shadow-primary/20"}`}>
               {following ? "Following" : "Follow"}
             </Button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-4 gap-3 mb-8">
          <StatPill icon={Package} label="Apps" value={String(myApps.length)} color="text-primary" />
          <StatPill icon={Download} label="Installs" value="-" color="text-secondary" />
          <StatPill icon={Users} label="Followers" value={String(followers.length)} color="text-accent" />
          <StatPill icon={UserCheck} label="Following" value={String(followList.length)} color="text-yellow-400" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex items-center gap-1 border-b border-border/40 mb-6 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`relative px-4 py-3 text-sm font-mono font-medium shrink-0 transition-colors ${activeTab === tab ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              {tab}
              {activeTab === tab && (
                <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === "Apps" && (
            <motion.div key="apps" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
              {myApps.map(app => <AppCard key={app.id} app={app} />)}
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className="border-2 border-dashed border-border/40 hover:border-primary/30 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 cursor-pointer group transition-all duration-300 min-h-[140px]"
              >
                <div className="w-10 h-10 rounded-xl border border-dashed border-border/60 group-hover:border-primary/50 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                  <Package className="w-5 h-5" />
                </div>
                <p className="text-xs text-muted-foreground font-mono group-hover:text-foreground transition-colors">Submit new app</p>
              </motion.div>
            </motion.div>
          )}

          {activeTab === "Activity" && (
            <motion.div key="activity" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="relative mb-12">
              {activityFeed.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground font-mono text-sm border-dashed border border-border/50 rounded-xl">No recent activity detected.</div>
              ) : (
                <>
                  <div className="absolute left-4 top-4 bottom-4 w-px bg-gradient-to-b from-primary/50 via-border/30 to-transparent" />
                  <div className="flex flex-col gap-0">
                    {activityFeed.map((item, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }} className="relative flex items-start gap-4 pb-6 pl-2 last:pb-0">
                        <div className="relative z-10 w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center shrink-0">
                          <Activity className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0 pt-1 glass rounded-xl px-4 py-3 border border-border/40">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm">@{item.actor?.username || "System"} interacted implicitly.</p>
                            <time className="text-[10px] font-mono text-muted-foreground shrink-0">{new Date(item.createdAt).toLocaleDateString()}</time>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {activeTab === "Followers" && (
            <motion.div key="followers" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="mb-12">
              <p className="text-xs text-muted-foreground font-mono mb-4">{followers.length} followers</p>
              <UserGrid users={followers} />
            </motion.div>
          )}

          {activeTab === "Following" && (
            <motion.div key="following" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="mb-12">
              <p className="text-xs text-muted-foreground font-mono mb-4">{followList.length} following</p>
              <UserGrid users={followList} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
