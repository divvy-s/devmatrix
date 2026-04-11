"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/global/icons";
import {
  Package, Trash2, Send, Clock, Star, GitBranch,
  Plus, FolderOpen, AlertCircle, Loader2
} from "lucide-react";
import { useGitHubRepos, GitHubRepo } from "@/hooks/use-github";
import { signIn } from "next-auth/react";

export type DraftApp = {
  id: string;
  repo: string;
  name: string;
  description: string;
  category: string;
  tags: string;
  permissions: string[];
  createdAt: string;
  status: "draft" | "submitted";
};

function useDrafts() {
  const [drafts, setDrafts] = useState<DraftApp[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("castkit_drafts");
    if (stored) {
      try {
        setDrafts(JSON.parse(stored));
      } catch { /* ignore */ }
    }
  }, []);

  const saveDrafts = useCallback((next: DraftApp[]) => {
    setDrafts(next);
    localStorage.setItem("castkit_drafts", JSON.stringify(next));
  }, []);

  const addDraft = useCallback((draft: Omit<DraftApp, "id" | "createdAt" | "status">) => {
    const newDraft: DraftApp = {
      ...draft,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: "draft",
    };
    saveDrafts([newDraft, ...drafts]);
  }, [drafts, saveDrafts]);

  const removeDraft = useCallback((id: string) => {
    saveDrafts(drafts.filter(d => d.id !== id));
  }, [drafts, saveDrafts]);

  const markSubmitted = useCallback((id: string) => {
    saveDrafts(drafts.map(d => d.id === id ? { ...d, status: "submitted" as const } : d));
  }, [drafts, saveDrafts]);

  return { drafts, addDraft, removeDraft, markSubmitted };
}

export default function AssetsPage() {
  const { data: session } = useSession();
  const hasGitHub = !!(session as any)?.githubAccessToken;
  const { data: repos, isPending: reposLoading } = useGitHubRepos();
  const { drafts, addDraft, removeDraft, markSubmitted } = useDrafts();
  const [showRepoPicker, setShowRepoPicker] = useState(false);

  const handleAddRepo = (repo: GitHubRepo) => {
    // Check if already added
    if (drafts.some(d => d.repo === repo.full_name)) return;
    addDraft({
      repo: repo.full_name,
      name: repo.name,
      description: repo.description || "",
      category: "",
      tags: repo.language || "",
      permissions: [],
    });
    setShowRepoPicker(false);
  };

  const draftApps = drafts.filter(d => d.status === "draft");
  const submittedApps = drafts.filter(d => d.status === "submitted");

  return (
    <div className="container mx-auto px-4 md:px-6 py-8 sm:py-12 max-w-5xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tighter">
            My Assets
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            Save GitHub repos as draft mini-apps, then publish when ready.
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {hasGitHub ? (
            <Button
              onClick={() => setShowRepoPicker(p => !p)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4 mr-2" /> Add from GitHub
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => signIn("github", { callbackUrl: "/assets" })}
              className="border-border/50 font-mono"
            >
              <Icons.gitHub className="w-4 h-4 mr-2" /> Connect GitHub
            </Button>
          )}
        </motion.div>
      </div>

      {/* GitHub Repo Picker */}
      <AnimatePresence>
        {showRepoPicker && hasGitHub && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 overflow-hidden"
          >
            <Card className="p-5 border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-sm flex items-center gap-2">
                  <Icons.gitHub className="w-4 h-4" /> Select a Repository
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setShowRepoPicker(false)} className="text-xs">
                  Close
                </Button>
              </div>
              {reposLoading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-mono">Loading repos...</span>
                </div>
              ) : repos && repos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {repos.map((repo) => {
                    const alreadyAdded = drafts.some(d => d.repo === repo.full_name);
                    return (
                      <button
                        key={repo.id}
                        onClick={() => !alreadyAdded && handleAddRepo(repo)}
                        disabled={alreadyAdded}
                        className={`text-left p-3 rounded-xl border transition-all ${
                          alreadyAdded
                            ? "border-primary/30 bg-primary/5 opacity-60 cursor-not-allowed"
                            : "border-border/50 bg-card/30 hover:border-primary/40 hover:bg-card/60 cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <GitBranch className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="font-mono text-sm truncate">{repo.full_name}</span>
                          {alreadyAdded && <Badge variant="outline" className="text-[9px] shrink-0 border-primary/30 text-primary">Added</Badge>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                          {repo.language && <span>{repo.language}</span>}
                          <span className="flex items-center gap-0.5">
                            <Star className="w-3 h-3 text-yellow-400" />{repo.stargazers_count}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No repos found.</p>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Draft Apps Section */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="flex items-center gap-2 mb-4">
          <FolderOpen className="w-4 h-4 text-yellow-400" />
          <h2 className="font-display font-bold text-lg">Drafts</h2>
          <Badge variant="outline" className="text-[10px] font-mono border-yellow-500/30 text-yellow-500">{draftApps.length}</Badge>
        </div>

        {draftApps.length === 0 ? (
          <Card className="p-8 border-dashed border-border/50 text-center mb-10">
            <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-display font-bold text-lg mb-1">No drafts yet</h3>
            <p className="text-sm text-muted-foreground font-mono mb-4">
              Add a GitHub repo to start building your mini-app pipeline.
            </p>
            {hasGitHub ? (
              <Button variant="outline" onClick={() => setShowRepoPicker(true)} className="border-border/50">
                <Plus className="w-4 h-4 mr-2" /> Add from GitHub
              </Button>
            ) : (
              <Button variant="outline" onClick={() => signIn("github", { callbackUrl: "/assets" })} className="border-border/50">
                <Icons.gitHub className="w-4 h-4 mr-2" /> Connect GitHub first
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {draftApps.map((draft) => (
              <motion.div
                key={draft.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                layout
              >
                <Card className="p-5 border-border/50 bg-card/60 hover:border-yellow-500/30 transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-yellow-500" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display font-bold text-sm truncate">{draft.name}</h3>
                        <p className="text-xs text-muted-foreground font-mono flex items-center gap-1 truncate">
                          <Icons.gitHub className="w-3 h-3 shrink-0" />{draft.repo}
                        </p>
                      </div>
                    </div>
                  </div>
                  {draft.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">{draft.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground mb-4">
                    <Clock className="w-3 h-3" />
                    {new Date(draft.createdAt).toLocaleDateString()}
                    {draft.tags && <Badge variant="outline" className="text-[9px] border-border/50">{draft.tags}</Badge>}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/submit?repo=${encodeURIComponent(draft.repo)}&name=${encodeURIComponent(draft.name)}&desc=${encodeURIComponent(draft.description)}`} className="flex-1">
                      <Button size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-mono">
                        <Send className="w-3 h-3 mr-1.5" /> Publish
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeDraft(draft.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Submitted Apps Section */}
      {submittedApps.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="flex items-center gap-2 mb-4">
            <Send className="w-4 h-4 text-primary" />
            <h2 className="font-display font-bold text-lg">Submitted</h2>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">{submittedApps.length}</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {submittedApps.map((app) => (
              <Card key={app.id} className="p-5 border-primary/20 bg-primary/5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-sm truncate">{app.name}</h3>
                    <Badge variant="outline" className="text-[9px] font-mono border-primary/30 text-primary mt-0.5">Published</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground font-mono flex items-center gap-1 truncate">
                  <Icons.gitHub className="w-3 h-3 shrink-0" />{app.repo}
                </p>
              </Card>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
