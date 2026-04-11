"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, TrendingUp, X, ChevronDown, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useApprovedApps } from "@/hooks/use-apps";

const FILTERS = ["All", "Web3", "AI", "DeFi", "Social", "Gaming", "Tools"];
const SORTS = ["Trending", "Newest", "Most Installed", "Top Rated"];

export default function ExplorePage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeSort, setActiveSort] = useState("Trending");
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  const { data, isPending, isError, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useApprovedApps();
  const allApps = data?.pages.flatMap(p => p.data) || [];

  const filtered = allApps.filter((p) => {
    const matchesFilter = activeFilter === "All" || p.type === activeFilter;
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.creator.username.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="container mx-auto px-4 md:px-6 py-8 sm:py-12 max-w-7xl">
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

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        <div className="flex-1 min-w-0">
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
                </SheetContent>
              </Sheet>

              <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 border-border/50 hidden lg:flex" aria-label="Filters">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>

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
            </div>

            {(activeFilter !== "All" || search) && (
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <span>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
                {activeFilter !== "All" && (
                  <button onClick={() => setActiveFilter("All")} className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors">
                    <span>{activeFilter}</span><X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {isPending ? (
               <motion.div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                 {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-48 rounded-xl bg-card border border-border/50 animate-pulse" />
                 ))}
               </motion.div>
            ) : isError ? (
               <div className="p-8 text-center text-muted-foreground flex flex-col items-center border border-border/50 rounded-2xl">
                 <AlertCircle className="w-8 h-8 text-destructive mb-2" />
                 <p className="mb-4">Failed to load apps.</p>
                 <Button variant="outline" onClick={() => refetch()}>Try again</Button>
               </div>
            ) : filtered.length > 0 ? (
              <motion.div
                key={activeFilter + search}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6"
              >
                {filtered.map((project, i) => (
                  <motion.div key={project.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.4 }}>
                    <ProjectCard 
                        id={project.id}
                        name={project.name}
                        creator={{ username: project.creator.username || "dev", avatar: project.creator.avatarUrl || "" }}
                        description={project.description}
                        stars={project.stars || 0}
                        installs={project.installs || 0}
                        tags={project.tags || []}
                        type={(project.type as any) || "Social"}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="font-display font-bold text-xl mb-2">No results found</h3>
                <p className="text-muted-foreground font-mono text-sm">Try a different search or filter</p>
                <Button variant="outline" className="mt-6 border-border/50" onClick={() => { setActiveFilter("All"); setSearch(""); }}>
                  Clear filters
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          {hasNextPage && (
            <div className="mt-8 flex justify-center">
              <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                 {isFetchingNextPage ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </div>

        <aside className="w-full lg:w-72 xl:w-80 flex flex-col gap-4 sm:gap-6 shrink-0">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="p-5 sm:p-6 rounded-2xl border border-primary/20 bg-primary/5 text-center">
            <div className="text-4xl sm:text-5xl font-black font-display text-primary mb-1">
              {allApps.length}+ 
            </div>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Active Mini-Apps</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="p-4 rounded-2xl border border-accent/20 bg-accent/5 text-sm">
            <p className="font-mono text-xs text-accent uppercase tracking-wider mb-1.5">💡 Tip</p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Use the SDK to submit your own mini-app. Approved apps appear here within 24h.
            </p>
            <Button render={<a href="/submit" />} variant="link" className="h-auto p-0 mt-2 text-accent text-xs font-mono">Submit an app →</Button>
          </motion.div>
        </aside>
      </div>
    </div>
  );
}
