"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/global/icons";
import { CheckCircle2, ChevronRight, UploadCloud, Rocket, Check, ArrowRight } from "lucide-react";

export default function SubmitProjectPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    repo: "",
    name: "",
    description: "",
    category: "",
    tags: "",
    permissions: [] as string[]
  });

  const PERMISSIONS = [
    { id: "post.write", name: "Write Posts", desc: "Allows the app to publish receipts or messages to the user's feed." },
    { id: "profile.read", name: "Read Profile", desc: "Access the user's basic profile details (name, avatar, bio)." },
    { id: "storage.write", name: "Storage Sync", desc: "Store application state data on decentralized storage mechanisms." },
    { id: "wallet.read", name: "Read Wallet Data", desc: "Read token balances or NFT holdings automatically." },
    { id: "notifications.push", name: "Push Notifications", desc: "Send direct notifications to the user for critical events." },
  ];

  const handleNext = () => setStep(s => Math.min(s + 1, 5));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));
  const togglePermission = (id: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(id) 
        ? prev.permissions.filter(p => p !== id) 
        : [...prev.permissions, id]
    }))
  };

  const isStepValid = () => {
    if (step === 1) return formData.repo !== "";
    if (step === 2) return formData.name !== "" && formData.description !== "";
    if (step === 3) return true; // Permissions optional?
    return true;
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="font-display text-4xl font-bold mb-4">Deploy Mini-App</h1>
        <p className="text-muted-foreground font-mono">Create interactive social experiences for Web3.</p>
      </div>

      {step < 5 && (
        <div className="mb-12 relative flex justify-between">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border/40 -z-10 -translate-y-1/2" />
          {[1, 2, 3, 4].map(num => (
            <div key={num} className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-mono font-bold transition-colors ${
                step === num 
                  ? "bg-primary border-primary text-black" 
                  : step > num 
                    ? "bg-[#0a0a0a] border-primary text-primary" 
                    : "bg-[#0a0a0a] border-border/40 text-muted-foreground"
              }`}>
                {step > num ? <Check className="w-5 h-5" /> : num}
              </div>
              <span className={`text-xs uppercase tracking-wider font-mono ${step === num ? "text-primary" : "text-muted-foreground"}`}>
                {num === 1 ? "Connect" : num === 2 ? "Manifest" : num === 3 ? "Scopes" : "Review"}
              </span>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="p-8 border-border/50 bg-[#0c0c0c] flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <Icons.gitHub className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-display font-bold mb-2">Connect GitHub Repository</h2>
              <p className="text-muted-foreground mb-8">Link the repository containing your CastKit mini-app source code.</p>
              
              {!formData.repo ? (
                <div className="w-full max-w-sm space-y-4">
                  <Button variant="outline" className="w-full h-12 justify-start border-border/50 hover:bg-white/5" onClick={() => setFormData({...formData, repo: "alice/coffee-tip"})}>
                    <Icons.gitHub className="w-5 h-5 mr-3" /> alice/coffee-tip
                  </Button>
                  <Button variant="outline" className="w-full h-12 justify-start border-border/50 hover:bg-white/5" onClick={() => setFormData({...formData, repo: "alice/nft-minter"})}>
                    <Icons.gitHub className="w-5 h-5 mr-3" /> alice/nft-minter
                  </Button>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/40" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0c0c0c] px-2 text-muted-foreground">Or</span></div>
                  </div>
                  <Input placeholder="paste repository url..." className="border-border/50 h-12 font-mono" />
                </div>
              ) : (
                <div className="w-full max-w-sm p-4 border border-primary/30 bg-primary/5 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icons.gitHub className="w-5 h-5 text-primary" />
                    <span className="font-mono">{formData.repo}</span>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="p-8 border-border/50 bg-[#0c0c0c]">
              <h2 className="text-2xl font-display font-bold mb-6">App Manifest details</h2>
              
              <div className="space-y-6">
                <div className="flex gap-6 max-sm:flex-col">
                  <div className="w-32 h-32 shrink-0 rounded-2xl border-2 border-dashed border-border/50 flex flex-col items-center justify-center bg-card/30 text-muted-foreground hover:bg-card/50 hover:text-foreground hover:border-primary/50 transition-colors cursor-pointer">
                    <UploadCloud className="w-8 h-8 mb-2" />
                    <span className="text-xs font-mono">App Icon</span>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">App Name</label>
                      <Input placeholder="e.g. Coffee Tip" className="bg-background/50 border-border/50" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Category</label>
                      <select className="flex h-10 w-full items-center justify-between rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                        <option value="">Select category...</option>
                        <option value="Social">Social</option>
                        <option value="DeFi">DeFi</option>
                        <option value="Gaming">Gaming</option>
                        <option value="Utility">Utility</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Short Description</label>
                  <Input placeholder="Describe what it does in 1-2 sentences..." className="bg-background/50 border-border/50" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block flex items-center justify-between">
                    <span>Tags</span>
                    <span className="text-xs text-muted-foreground font-mono">Comma separated</span>
                  </label>
                  <Input placeholder="payments, usdc, utility" className="font-mono text-sm bg-background/50 border-border/50" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} />
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="p-8 border-border/50 bg-[#0c0c0c]">
              <div className="mb-6">
                <h2 className="text-2xl font-display font-bold mb-2">Required Permissions</h2>
                <p className="text-muted-foreground">Select the SDK scopes your app needs. Users will be asked to approve these during installation.</p>
              </div>

              <div className="space-y-3">
                {PERMISSIONS.map((perm) => {
                  const isSelected = formData.permissions.includes(perm.id);
                  return (
                    <div 
                      key={perm.id} 
                      onClick={() => togglePermission(perm.id)}
                      className={`p-4 rounded-xl border flex items-center gap-4 cursor-pointer transition-colors ${
                        isSelected ? "border-primary bg-primary/5" : "border-border/50 bg-background/50 hover:border-primary/50"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border flex flex-shrink-0 items-center justify-center transition-colors ${isSelected ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                        {isSelected && <Check className="w-3 h-3 text-black" />}
                      </div>
                      <div className="flex-1">
                        <div className="font-mono text-sm font-bold text-foreground mb-1">{perm.id}</div>
                        <div className="text-sm text-muted-foreground">{perm.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="p-8 border-border/50 bg-[#0c0c0c]">
              <h2 className="text-2xl font-display font-bold mb-6">Review & Deploy</h2>
              
              <div className="p-6 rounded-xl border border-primary/20 bg-primary/5 mb-8">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-primary/20">
                  <div className="w-16 h-16 rounded-2xl bg-primary/20 flex flex-shrink-0 items-center justify-center text-2xl border border-primary/30">
                    🚀
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-2xl text-primary">{formData.name || "Untitled App"}</h3>
                    <p className="text-sm text-foreground/80">{formData.description || "No description provided."}</p>
                  </div>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="flex">
                    <span className="w-32 text-muted-foreground font-mono uppercase tracking-wider text-xs">Repository</span>
                    <span className="font-mono">{formData.repo}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 text-muted-foreground font-mono uppercase tracking-wider text-xs">Category</span>
                    <Badge variant="outline" className="border-border/50">{formData.category}</Badge>
                  </div>
                  <div className="flex">
                    <span className="w-32 text-muted-foreground font-mono uppercase tracking-wider text-xs">Permissions</span>
                    <div className="flex flex-wrap gap-2">
                      {formData.permissions.length === 0 ? <span className="text-muted-foreground">None</span> : formData.permissions.map(p => (
                        <Badge key={p} variant="secondary" className="font-mono text-[10px] bg-secondary/10 text-secondary border-none">{p}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div key="step5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="p-12 border-primary/50 bg-[#0a0a0a] text-center flex flex-col items-center">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: 360 }}
                transition={{ type: "spring", duration: 1, delay: 0.2 }}
                className="w-24 h-24 rounded-full bg-primary/20 text-primary flex items-center justify-center mb-6"
              >
                <Rocket className="w-12 h-12" />
              </motion.div>
              <h2 className="text-3xl font-display font-bold mb-4">Liftoff successful!</h2>
              <p className="text-muted-foreground mb-8 max-w-md">
                <span className="text-foreground font-medium">{formData.name}</span> has been deployed to the CastKit registry and is now awaiting indexing.
              </p>
              <div className="p-4 rounded border border-border/50 bg-card/50 flex items-center justify-between w-full max-w-md mb-8">
                <span className="font-mono text-sm text-muted-foreground">castkit.xyz/app/alice/coffee-tip</span>
                <Button variant="outline" size="sm" className="h-8 shadow-none">Copy URL</Button>
              </div>
              <a href="/dashboard" className={cn(buttonVariants({ variant: "default" }), "bg-primary text-primary-foreground hover:bg-primary/90")}>
                Go to Developer Dashboard
              </a>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {step < 5 && (
        <div className="mt-8 flex justify-between items-center">
          <Button 
            variant="outline" 
            onClick={handleBack} 
            disabled={step === 1}
            className="border-border/50 bg-background/50 hover:bg-white/5"
          >
            Go Back
          </Button>
          <Button 
            onClick={handleNext} 
            disabled={!isStepValid()}
            className={`${step === 4 ? "bg-primary text-primary-foreground font-bold font-mono" : "bg-white text-black font-mono font-bold"}`}
          >
            {step === 4 ? "Sign & Deploy" : "Continue"}
            {step === 4 ? <Rocket className="w-4 h-4 ml-2" /> : <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      )}
    </div>
  );
}
