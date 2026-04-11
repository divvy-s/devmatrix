"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Download, Activity, DollarSign, Plug, Settings, Plus,
  BarChart3, Clock, AlertCircle, Zap, TrendingUp, ArrowUpRight, User, Loader2
} from "lucide-react";
import { useMyApps } from "@/hooks/use-apps";

const STATS = [
  { label: "Total Installs", value: "124,592", delta: "+20.1%", icon: Download, color: "text-primary", deltaColor: "text-primary" },
  { label: "Daily Active Users", value: "14,204", delta: "+5.4% today", icon: Activity, color: "text-secondary", deltaColor: "text-secondary" },
  { label: "Revenue (30d)", value: "$8,459", delta: "via Stripe Connect", icon: DollarSign, color: "text-green-500", deltaColor: "text-muted-foreground" },
  { label: "Active Apps", value: "3", delta: "1 update pending", icon: Plug, color: "text-accent", deltaColor: "text-yellow-500" },
];

const STATUS_STYLES: Record<string, string> = {
  approved: "border-green-500/30 text-green-500 bg-green-500/10",
  pending: "border-yellow-500/30 text-yellow-500 bg-yellow-500/10",
  draft: "border-zinc-500/30 text-zinc-500 bg-zinc-500/10",
};

const ACTIVITY = [
  { icon: DollarSign, color: "text-green-500", title: "Payout Complete", desc: "$1,240 transferred via Stripe.", time: "2h ago" },
  { icon: Clock, color: "text-yellow-500", title: "App in Review", desc: "DAO Vote submitted to registry.", time: "1d ago" },
  { icon: AlertCircle, color: "text-destructive", title: "API Deprecation", desc: "Please upgrade SDK for CoffeeTip.", time: "3d ago" },
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const { data: appsData, isLoading: appsLoading } = useMyApps();

  return (
    <div className="container mx-auto px-4 md:px-6 py-8 sm:py-12 max-w-7xl">

      {/* ── Header ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
          {/* User avatar */}
          <Link href="/profile" className="shrink-0 group">
            <div className="w-12 h-12 rounded-xl border border-border/50 group-hover:border-primary/50 overflow-hidden bg-card transition-colors">
              {user?.image ? (
                <Image src={user.image} alt="avatar" width={48} height={48} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
              )}
            </div>
          </Link>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter">
              Dashboard
            </h1>
            <p className="text-muted-foreground font-mono text-xs">
              Welcome back, <span className="text-primary">{user?.name?.split(" ")[0] || "Developer"}</span>
            </p>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-2">
          <Link
            href="/profile"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "border-border/50 font-mono text-sm hidden sm:flex"
            )}
          >
            <User className="w-4 h-4 mr-2" /> Profile
          </Link>
          <Link
            href="/submit"
            className={cn(
              buttonVariants({ variant: "default" }),
              "bg-primary text-primary-foreground hover:bg-primary/90 font-mono shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
            )}
          >
            <Plus className="w-4 h-4 mr-2" /> Publish App
          </Link>
        </motion.div>
      </div>

      {/* ── Stats Grid ──────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
        {STATS.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <Card className="border-border/50 bg-card/60 glass hover:border-border transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">
                    {stat.label}
                  </CardTitle>
                  <Icon className={`h-4 w-4 shrink-0 ${stat.color}`} />
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="text-2xl sm:text-3xl font-black font-display">{stat.value}</div>
                  <p className={`text-xs font-mono mt-1 ${stat.deltaColor}`}>{stat.delta}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* ── Main Content Grid ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">

        {/* ── Left: Apps + Chart ──────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* My Apps — Desktop Table */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="border-border/50 glass">
              <CardHeader className="flex flex-row items-center justify-between p-5 sm:p-6">
                <CardTitle className="font-display font-black text-lg">My Apps</CardTitle>
                <Button variant="ghost" size="sm" className="text-xs font-mono text-muted-foreground hover:text-foreground gap-1">
                  View All <ArrowUpRight className="w-3 h-3" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase border-b border-border/40">
                      <tr>
                        <th className="px-5 sm:px-6 py-3 font-mono font-normal">Application</th>
                        <th className="px-4 py-3 font-mono font-normal">Status</th>
                        <th className="px-4 py-3 font-mono font-normal text-right">Installs</th>
                        <th className="px-4 py-3 font-mono font-normal text-right">Revenue</th>
                        <th className="px-4 py-3 font-mono font-normal text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {appsLoading ? (
                        <tr><td colSpan={5} className="py-8 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto"/></td></tr>
                      ) : (appsData?.pages.flatMap(p => p.data) || []).map((app: any) => (
                        <tr key={app.id} className="hover:bg-white/3 transition-colors group">
                          <td className="px-5 sm:px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-card border border-border/50 flex items-center justify-center shrink-0 text-base">
                                {app.iconUrl ? <img src={app.iconUrl} className="w-6 h-6 rounded-md object-cover" alt="" /> : "☕"}
                              </div>
                              <div>
                                <div className="font-bold text-sm">{app.name}</div>
                                <div className="text-xs text-muted-foreground font-mono">{app.category || app.type}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <Badge
                              variant="outline"
                              className={`font-mono text-[10px] uppercase ${STATUS_STYLES[app.status] || STATUS_STYLES.draft}`}
                            >
                              {app.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 text-right font-mono text-muted-foreground text-sm">{app.installCount || 0}</td>
                          <td className="px-4 py-4 text-right font-mono text-sm">$0</td>
                          <td className="px-4 py-4 text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                              <Settings className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card Stack */}
                <div className="sm:hidden flex flex-col divide-y divide-border/30">
                  {appsLoading ? (
                    <div className="py-8 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto"/></div>
                  ) : (appsData?.pages.flatMap(p => p.data) || []).map((app: any) => (
                    <div key={app.id} className="flex items-center justify-between p-4 hover:bg-white/3 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-card border border-border/50 flex items-center justify-center text-lg shrink-0">
                          {app.iconUrl ? <img src={app.iconUrl} className="w-6 h-6 rounded-md object-cover" alt="" /> : "☕"}
                        </div>
                        <div>
                          <div className="font-bold text-sm">{app.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge
                              variant="outline"
                              className={`font-mono text-[9px] uppercase px-1.5 py-0 ${STATUS_STYLES[app.status] || STATUS_STYLES.draft}`}
                            >
                              {app.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground font-mono">{app.category || app.type}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm font-bold">$0</div>
                        <div className="text-xs text-muted-foreground font-mono">{app.installCount || 0} installs</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Revenue Chart */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-border/50 glass">
              <CardHeader className="flex flex-row items-center justify-between p-5 sm:p-6">
                <div>
                  <CardTitle className="font-display font-black text-lg">Revenue History</CardTitle>
                  <CardDescription className="text-xs mt-0.5">30-day earnings across all apps</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="h-8 border-border/50 text-xs shrink-0">
                  <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Full Report</span>
                </Button>
              </CardHeader>
              <CardContent className="p-5 sm:p-6 pt-0">
                {/* Visual chart bars placeholder */}
                <div className="h-48 sm:h-64 w-full flex items-end justify-center gap-2 sm:gap-3 pb-4">
                  {[35, 55, 40, 70, 60, 80, 65, 90, 75, 85, 70, 95, 80, 100, 85].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-lg bg-gradient-to-t from-primary/60 to-primary/20 hover:from-primary hover:to-primary/40 transition-all duration-300 cursor-pointer"
                      style={{ height: `${h}%`, maxWidth: "40px" }}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs font-mono text-muted-foreground px-1">
                  <span>Mar 25</span>
                  <span>Apr 1</span>
                  <span>Apr 8</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ── Right Sidebar ────────────────────── */}
        <div className="space-y-4 sm:space-y-6">

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3 p-5">
                <CardTitle className="text-sm font-display font-black flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" /> Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 p-5 pt-0">
                <Button
                  variant="outline"
                  className="w-full justify-start border-primary/20 hover:bg-primary/10 hover:border-primary/40 text-sm transition-all"
                >
                  <Plug className="w-4 h-4 mr-2" /> Download SDK v1.2
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-primary/20 hover:bg-primary/10 hover:border-primary/40 text-sm transition-all"
                >
                  <BarChart3 className="w-4 h-4 mr-2" /> Conversion Analytics
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-primary/20 hover:bg-primary/10 hover:border-primary/40 text-sm transition-all"
                >
                  <TrendingUp className="w-4 h-4 mr-2" /> View Performance
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
          >
            <Card className="border-border/50 glass">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-sm font-display font-black">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="relative flex flex-col gap-0">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-4 bottom-4 w-px bg-gradient-to-b from-primary/40 via-border/40 to-transparent" />

                  {ACTIVITY.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={i} className="relative flex items-start gap-4 pb-5 last:pb-0">
                        <div className="relative z-10 w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center shrink-0">
                          <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className={`text-xs font-bold ${item.color}`}>{item.title}</span>
                            <time className="text-[10px] font-mono text-muted-foreground shrink-0">{item.time}</time>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stripe Status */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="p-4 rounded-2xl border border-green-500/20 bg-green-500/5 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
              <div>
                <p className="text-xs font-bold text-green-500">Stripe Connected</p>
                <p className="text-xs text-muted-foreground font-mono">Next payout: Apr 15</p>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
