import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Star, ShieldAlert, Key, Users, Activity, ExternalLink, ChevronLeft } from "lucide-react";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  // Mock data based on ID
  const project = {
    id,
    name: id === "1" ? "Coffee Tip" : "NFT Drop Widget",
    creator: { username: "alice", avatar: "" },
    description: "Send USDC in 1 click directly from social feeds. This mini-app handles standard EIP-2612 permits for gasless transactions and resolves ENS names automatically.",
    stars: 120,
    installs: "5.4k",
    dau: "1.2k",
    version: "1.2.4",
    githubRepo: "alice/coffee-tip",
    tags: ["payments", "usdc", "tipping"],
    type: "Social",
    permissions: [
      { scope: "wallet.requestSign", desc: "Request wallet signatures", color: "text-secondary border-secondary bg-secondary/10" },
      { scope: "profile.read", desc: "Read basic profile info", color: "text-green-500 border-green-500/50 bg-green-500/10" },
      { scope: "post.write", desc: "Publish receipts to feed", color: "text-accent border-accent/50 bg-accent/10" },
    ]
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Link href="/explore" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors font-mono">
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Explore
      </Link>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* MAIN COLUMN */}
        <div className="flex-1 min-w-0">

          {/* HEADER SECTION */}
          <div className="mb-8">
            <div className="flex items-start justify-between gap-4 flex-col sm:flex-row mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-3xl">
                  {id === "1" ? "☕" : "🎨"}
                </div>
                <div>
                  <h1 className="font-display text-4xl font-bold mb-1">{project.name}</h1>
                  <div className="flex items-center gap-3 text-muted-foreground text-sm">
                    <span className="flex items-center gap-1 font-mono">
                      <div className="w-4 h-4 rounded-full bg-border flex items-center justify-center text-[8px] font-bold uppercase text-foreground">
                        {project.creator.username.substring(0, 2)}
                      </div>
                      @{project.creator.username}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-sm bg-muted text-xs font-mono">{project.version}</span>
                  </div>
                </div>
              </div>

              <div className="flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-mono">
                  <Key className="w-4 h-4 mr-2" />
                  Install App
                </Button>
                <Button variant="outline" className="w-full border-border/50 bg-[#0c0c0c]">
                  View Source
                </Button>
              </div>
            </div>

            <p className="text-lg text-muted-foreground mb-4">
              {project.description}
            </p>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-border/50 text-foreground font-mono">
                {project.type}
              </Badge>
              {project.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="bg-secondary/5 text-secondary-foreground font-mono font-normal">
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>

          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="w-full justify-start border-b border-border/40 rounded-none bg-transparent p-0 h-auto mb-6 flex-wrap">
              <TabsTrigger value="preview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 font-mono text-xs uppercase tracking-wider">
                Live Preview
              </TabsTrigger>
              <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 font-mono text-xs uppercase tracking-wider">
                Overview
              </TabsTrigger>
              <TabsTrigger value="api" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 font-mono text-xs uppercase tracking-wider">
                API Docs
              </TabsTrigger>
              <TabsTrigger value="versions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 font-mono text-xs uppercase tracking-wider">
                Versions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="mt-0 outline-none">
              <div className="rounded-xl border border-border/50 overflow-hidden bg-[#0a0a0a]">
                {/* Simulated Iframe Header */}
                <div className="flex items-center px-4 py-2 border-b border-border/30 bg-[#121212] select-none text-xs text-muted-foreground font-mono justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-3 h-3 text-secondary" />
                    <span>Sandboxed Render</span>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-50">
                    <div className="w-2.5 h-2.5 rounded-full bg-border" />
                    <div className="w-2.5 h-2.5 rounded-full bg-border" />
                    <div className="w-2.5 h-2.5 rounded-full bg-border" />
                  </div>
                </div>

                {/* MiniApp Mock UI */}
                <div className="p-8 flex items-center justify-center min-h-[400px] bg-[url('/grid.svg')] bg-center relative">
                  <div className="absolute inset-0 bg-background/90" />
                  <div className="w-full max-w-sm relative z-10">
                    <Card className="border-border/50 bg-[#0c0c0c] shadow-2xl">
                      <div className="p-6 text-center border-b border-border/30">
                        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 text-2xl">
                          {id === "1" ? "☕" : "🎨"}
                        </div>
                        <h3 className="font-display text-xl font-bold mb-1">Buy creator a coffee</h3>
                        <p className="text-sm text-muted-foreground">Will send 5 USDC via Polygon</p>
                      </div>
                      <div className="p-6">
                        <Button className="w-full bg-white text-black hover:bg-gray-200 h-12 mb-3 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                          Connect Wallet
                        </Button>
                        <p className="text-xs text-center text-muted-foreground font-mono">
                          Powered by CastKit
                        </p>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="overview">
              <div className="prose prose-invert max-w-none">
                <h3>About this plugin</h3>
                <p>This mini-app allows content creators to receive tips seamlessly within their social feed without redirecting the user.</p>
                <h3>Features</h3>
                <ul>
                  <li>Gasless transactions enabled by default</li>
                  <li>Multi-chain support (Optimism, Base, Polygon)</li>
                  <li>Automatic receipts posted to user timeline</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>

        </div>

        {/* SIDEBAR */}
        <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">

          {/* STATS */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-border/50 bg-[#0c0c0c] flex flex-col">
              <span className="text-xs text-muted-foreground font-mono mb-1 flex items-center gap-1.5"> Total Installs</span>
              <span className="font-display font-bold text-2xl">{project.installs}</span>
            </div>
            <div className="p-4 rounded-xl border border-border/50 bg-[#0c0c0c] flex flex-col">
              <span className="text-xs text-muted-foreground font-mono mb-1 flex items-center gap-1.5"><Activity className="w-3 h-3 text-secondary" /> DAU</span>
              <span className="font-display font-bold text-2xl">{project.dau}</span>
            </div>
            <div className="p-4 rounded-xl border border-border/50 bg-[#0c0c0c] flex flex-col col-span-2">
              <span className="text-xs text-muted-foreground font-mono mb-1 flex items-center gap-1.5"><Star className="w-3 h-3 text-yellow-500 fill-yellow-500/20" /> Ratings (4.8/5)</span>
              <div className="flex items-center gap-1 mt-1">
                {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-4 h-4 ${s === 5 ? 'text-border' : 'text-yellow-500 fill-yellow-500'}`} />)}
                <span className="text-sm ml-2 text-muted-foreground font-medium">120 reviews</span>
              </div>
            </div>
          </div>

          {/* PERMISSIONS */}
          <div className="p-5 rounded-xl border border-border/50 bg-[#0c0c0c]">
            <h3 className="font-display font-bold text-base mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              Required Permissions
            </h3>
            <div className="flex flex-col gap-3">
              {project.permissions.map(perm => (
                <div key={perm.scope} className="flex flex-col gap-1">
                  <Badge variant="outline" className={`w-fit font-mono text-[10px] uppercase tracking-wider ${perm.color}`}>
                    {perm.scope}
                  </Badge>
                  <span className="text-sm text-foreground">{perm.desc}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border/30 text-xs text-muted-foreground leading-relaxed">
              Upon installation, the user will be prompted to grant these permissions. They can be revoked at any time.
            </div>
          </div>

          {/* CREATOR */}
          <div className="p-5 rounded-xl border border-border/50 bg-[#0c0c0c]">
            <h3 className="font-display font-bold text-base mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Creator Team
            </h3>
            <div className="flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-border flex items-center justify-center font-bold uppercase">
                  {project.creator.username.substring(0, 2)}
                </div>
                <div>
                  <div className="font-medium text-sm">@{project.creator.username}</div>
                  <div className="text-xs text-muted-foreground">Joined Mar 2026</div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
