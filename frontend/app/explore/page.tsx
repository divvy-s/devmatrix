"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, TrendingUp, X, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const FILTERS = ["All", "Web3", "AI", "DeFi", "Social", "Gaming", "Tools"];
const SORTS = ["Trending", "Newest", "Most Installed", "Top Rated"];

const MOCK_PROJECTS = [
  { id: "1", name: "Coffee Tip", creator: { username: "alice", avatar: "" }, description: "Send USDC in 1 click directly from social feeds.", stars: 120, installs: 5400, tags: ["payments", "usdc", "tipping"], type: "Social" as const },
  { id: "2", name: "NFT Drop Widget", creator: { username: "bob_builder", avatar: "" }, description: "Mint NFTs directly from a post without leaving the app.", stars: 340, installs: 12000, tags: ["nft", "mint", "erc721"], type: "Web3" as const },
  { id: "3", name: "Swap Box", creator: { username: "defi_dj", avatar: "" }, description: "Inline token swaps via Uniswap V3 protocol.", stars: 89, installs: 2100, tags: ["swap", "dex", "amm"], type: "DeFi" as const },
  { id: "4", name: "AI Roast", creator: { username: "chadGPT", avatar: "" }, description: "Get your wallet roasted by an AI agent.", stars: 450, installs: 8900, tags: ["ai", "fun", "agent"], type: "AI" as const },
  { id: "5", name: "FlappyEth", creator: { username: "gamerXYZ", avatar: "" }, description: "Play flappy bird and earn ETH for high scores.", stars: 55, installs: 850, tags: ["game", "play2earn"], type: "Gaming" as const },
  { id: "6", name: "Gas Fetcher", creator: { username: "devtools", avatar: "" }, description: "Real-time gas prices shown in your feed.", stars: 310, installs: 19000, tags: ["utils", "gas", "tracker"], type: "Tools" as const },
];

const TOP_CREATORS = [
  { name: "alice", apps: 12, installs: "450k" },
  { name: "bob_builder", apps: 8, installs: "210k" },
  { name: "defi_dj", apps: 5, installs: "180k" },
  { name: "chadGPT", apps: 3, installs: "95k" },
];

export default function ExplorePage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeSort, setActiveSort] = useState("Trending");
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  const filtered = MOCK_PROJECTS.filter((p) => {
    const matchesFilter = activeFilter === "All" || p.type === activeFilter;
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.creator.username.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="container mx-auto px-4 md:px-6 py-8 sm:py-12 max-w-7xl">

      {/* ── Page Header ─────────────────────── */}
      <div className="mb-8 sm:mb-10">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter mb-2 sm:mb-3"
        >
          Explore Projects
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="text-muted-foreground text-base sm:text-lg"
        >
          Discover and install mini-apps for your feed.
        </motion.p>
      </div>

      {/* ── Main Layout ─────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">

        {/* ── MAIN CONTENT ─────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Search & Filter Bar */}
          <div className="flex flex-col gap-3 mb-6 sm:mb-8">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="explore-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search projects, tags, creators..."
                  className="pl-9 bg-card/30 border-border/50 focus-visible:ring-primary h-11"
                />
              </div>

              {/* Mobile: filter sheet trigger */}
              <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                <SheetTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 shrink-0 border-border/50 lg:hidden"
                      aria-label="Filters"
                    />
                  }
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </SheetTrigger>
                <SheetContent side="bottom" className="h-auto rounded-t-3xl bg-card border-border/50 p-6">
                  <SheetHeader className="mb-5 p-0">
                    <SheetTitle className="text-left font-display font-black text-lg">Filters</SheetTitle>
                  </SheetHeader>
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Category</p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {FILTERS.map((f) => (
                      <button
                        key={f}
                        onClick={() => { setActiveFilter(f); setFilterOpen(false); }}
                        className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all border ${
                          activeFilter === f
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card border-border/50 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Sort By</p>
                  <div className="flex flex-wrap gap-2">
                    {SORTS.map((s) => (
                      <button
                        key={s}
                        onClick={() => { setActiveSort(s); setFilterOpen(false); }}
                        className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all border ${
                          activeSort === s
                            ? "bg-secondary text-secondary-foreground border-secondary"
                            : "bg-card border-border/50 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>

              {/* Desktop: filters button (cosmetic) */}
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 shrink-0 border-border/50 hidden lg:flex"
                aria-label="Filters"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>

            {/* Desktop filter chips */}
            <div className="flex items-center justify-between gap-4 overflow-x-auto pb-1 scrollbar-hide">
              <div className="flex gap-2 shrink-0">
                {FILTERS.map((filter) => (
                  <Badge
                    key={filter}
                    variant={activeFilter === filter ? "default" : "outline"}
                    className={`cursor-pointer px-3 py-1.5 text-xs font-mono transition-all shrink-0 ${
                      activeFilter === filter
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                        : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                    onClick={() => setActiveFilter(filter)}
                  >
                    {filter}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0 font-mono">
                <span className="hidden sm:inline text-muted-foreground/60">Sort:</span>
                <div className="relative">
                  <select
                    value={activeSort}
                    onChange={(e) => setActiveSort(e.target.value)}
                    className="appearance-none bg-transparent border border-border/40 rounded-lg pl-3 pr-7 py-1.5 text-xs font-mono text-foreground cursor-pointer outline-none hover:border-border"
                  >
                    {SORTS.map((s) => (
                      <option key={s} value={s} className="bg-background">{s}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Active filter indicator */}
            {(activeFilter !== "All" || search) && (
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <span>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
                {activeFilter !== "All" && (
                  <button
                    onClick={() => setActiveFilter("All")}
                    className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                  >
                    <span>{activeFilter}</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Project Grid */}
          <AnimatePresence mode="wait">
            {filtered.length > 0 ? (
              <motion.div
                key={activeFilter + search}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6"
              >
                {filtered.map((project, i) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.4 }}
                  >
                    <ProjectCard {...project} />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="font-display font-bold text-xl mb-2">No results found</h3>
                <p className="text-muted-foreground font-mono text-sm">
                  Try a different search or filter
                </p>
                <Button
                  variant="outline"
                  className="mt-6 border-border/50"
                  onClick={() => { setActiveFilter("All"); setSearch(""); }}
                >
                  Clear filters
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── SIDEBAR ──────────────────────── */}
        <aside className="w-full lg:w-72 xl:w-80 flex flex-col gap-4 sm:gap-6 shrink-0">

          {/* Stats Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-5 sm:p-6 rounded-2xl border border-primary/20 bg-primary/5 text-center"
          >
            <div className="text-4xl sm:text-5xl font-black font-display text-primary mb-1">1,204</div>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Active Mini-Apps</p>
          </motion.div>

          {/* Top Creators */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-5 sm:p-6 rounded-2xl border border-border/50 glass"
          >
            <h3 className="font-display font-black text-base sm:text-lg mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-secondary shrink-0" />
              Top Creators
            </h3>
            <div className="flex flex-col gap-3">
              {TOP_CREATORS.map((creator, i) => (
                <div key={creator.name} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 border border-border/50 flex items-center justify-center text-xs font-black uppercase text-foreground shrink-0">
                      {creator.name.substring(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">@{creator.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{creator.apps} apps</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{creator.installs}</span>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full mt-5 text-xs font-mono border-border/50 hover:border-secondary/50 hover:bg-secondary/5"
            >
              View Leaderboard
            </Button>
          </motion.div>

          {/* Quick tip */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="p-4 rounded-2xl border border-accent/20 bg-accent/5 text-sm"
          >
            <p className="font-mono text-xs text-accent uppercase tracking-wider mb-1.5">💡 Tip</p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Use the SDK to submit your own mini-app. Approved apps appear here within 24h.
            </p>
            <Button render={<a href="/submit" />} variant="link" className="h-auto p-0 mt-2 text-accent text-xs font-mono">
              Submit an app →
            </Button>
          </motion.div>

        </aside>
      </div>
    </div>
  );
}
