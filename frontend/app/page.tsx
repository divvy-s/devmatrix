"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Terminal, Zap, Fingerprint, Code, LayoutTemplate,
  ArrowRight, ChevronRight, Star, Users, Package, TrendingUp
} from "lucide-react";

/* ─── Animated Counter ─────────────────────── */
function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { duration: 2000, bounce: 0 });
  const [display, setDisplay] = useState("0");
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (inView) motionVal.set(value);
  }, [inView, value, motionVal]);

  useEffect(() => {
    return spring.on("change", (v) => {
      if (v >= 1000) setDisplay((Math.round(v / 100) / 10).toFixed(1) + "k");
      else setDisplay(Math.round(v).toString());
    });
  }, [spring]);

  return <span ref={ref}>{display}{suffix}</span>;
}

/* ─── Services Data ────────────────────────── */
const SERVICES = [
  {
    id: "miniapp",
    title: "Mini-App Engine",
    subtitle: "Embedded interactive frames",
    desc: "Sandboxed iframes with secure postMessage gateways. Render your React components directly in social feeds safely.",
    tags: ["React", "Next.js", "iFrame", "postMessage"],
    icon: LayoutTemplate,
    color: "text-primary",
    glowColor: "shadow-primary/20",
    borderColor: "border-primary/20 hover:border-primary/50",
  },
  {
    id: "web3",
    title: "Web3 Native",
    subtitle: "Wallet-first architecture",
    desc: "Native viem/wagmi support. Sign transactions, manage permissions, broadcast tx without users leaving social context.",
    tags: ["viem", "wagmi", "ethers", "Solidity"],
    icon: Fingerprint,
    color: "text-secondary",
    glowColor: "shadow-secondary/20",
    borderColor: "border-secondary/20 hover:border-secondary/50",
  },
  {
    id: "ai",
    title: "AI Recommendations",
    subtitle: "Algorithmic feed ranking",
    desc: "FastAPI/PyTorch backends to suggest mini-apps to relevant wallets based on past on-chain history and behaviour.",
    tags: ["PyTorch", "FastAPI", "OpenAI", "Vectors"],
    icon: Zap,
    color: "text-accent",
    glowColor: "shadow-accent/20",
    borderColor: "border-accent/20 hover:border-accent/50",
  },
  {
    id: "sdk",
    title: "Plug-and-Play SDK",
    subtitle: "One hook, full platform",
    desc: "Use the `useCastKit` hook to manage identity, fetch session tokens, and interact with the social graph seamlessly.",
    tags: ["TypeScript", "React", "Hooks", "GraphQL"],
    icon: Code,
    color: "text-blue-400",
    glowColor: "shadow-blue-400/20",
    borderColor: "border-blue-400/20 hover:border-blue-400/50",
  },
];

/* ─── Stats ────────────────────────────────── */
const STATS = [
  { label: "Mini-Apps Deployed", value: 1204, suffix: "+", icon: Package },
  { label: "Active Developers", value: 8400, suffix: "", icon: Users },
  { label: "Feed Interactions", value: 2800000, suffix: "", icon: TrendingUp },
  { label: "GitHub Stars", value: 3200, suffix: "", icon: Star },
];

/* ─── Terminal Typer ───────────────────────── */
function TerminalTyper() {
  const [text, setText] = useState("");
  const commands = ["castkit init my-app", "castkit deploy --env prod", "castkit publish --mint"];

  useEffect(() => {
    let cmdIdx = 0, charIdx = 0, deleting = false;
    let timer: NodeJS.Timeout;
    const tick = () => {
      const cmd = commands[cmdIdx];
      if (!deleting) {
        setText(cmd.substring(0, charIdx + 1));
        charIdx++;
        if (charIdx === cmd.length) { deleting = true; timer = setTimeout(tick, 2000); return; }
      } else {
        setText(cmd.substring(0, charIdx - 1));
        charIdx--;
        if (charIdx === 0) { deleting = false; cmdIdx = (cmdIdx + 1) % commands.length; }
      }
      timer = setTimeout(tick, deleting ? 25 : 65);
    };
    timer = setTimeout(tick, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="rounded-2xl border border-border/50 bg-[#0a0a0a] shadow-2xl shadow-black/50 overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#111]">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-primary/80" />
        </div>
        <div className="flex items-center text-xs font-mono text-muted-foreground">
          <Terminal className="w-3 h-3 mr-1.5" />
          bash — castkit
        </div>
        <div className="w-16" />
      </div>
      {/* Terminal body */}
      <div className="p-5 sm:p-6 text-left font-mono text-sm leading-relaxed min-h-[160px] sm:min-h-[180px]">
        <div className="flex text-muted-foreground mb-2 flex-wrap">
          <span className="text-primary mr-2 shrink-0">~/projects</span>
          <span>$ npx create-castkit-app@latest .</span>
        </div>
        <div className="text-primary/80 mb-1 text-xs">✔ Scaffolding project structure...</div>
        <div className="text-secondary/80 mb-1 text-xs">✔ Installing dependencies...</div>
        <div className="text-primary mb-4 text-xs font-bold">✔ CastKit app ready!</div>
        <div className="flex items-center text-base sm:text-lg font-medium flex-wrap">
          <span className="text-primary mr-2 shrink-0">~/projects</span>
          <span>$ {text}</span>
          <span className="animate-pulse bg-primary w-2.5 h-[1.1em] ml-1 inline-block opacity-90 rounded-sm" />
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ────────────────────────────── */
export default function LandingPage() {
  const [hoveredService, setHoveredService] = useState<string | null>(null);

  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  });

  return (
    <div className="flex flex-col items-center overflow-x-hidden">

      {/* ── HERO ──────────────────────────────── */}
      <section className="relative w-full min-h-screen-safe flex flex-col items-center justify-center text-center px-4 md:px-6 pt-20 pb-16 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px]" />
          <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-secondary/5 rounded-full blur-[80px]" />
        </div>

        <div className="relative z-10 max-w-5xl w-full mx-auto">
          {/* Badge */}
          <motion.div {...fadeUp(0)}>
            <Badge
              variant="outline"
              className="mb-6 sm:mb-8 bg-primary/5 text-primary border-primary/25 px-3 sm:px-4 py-1.5 font-mono text-xs hover:bg-primary/10 transition-colors cursor-default"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block mr-2 animate-pulse" />
              v0.1.0 Public Alpha · Now Open
              <ChevronRight className="w-3 h-3 ml-1 opacity-60" />
            </Badge>
          </motion.div>

          {/* Headline */}
          <motion.h1
            {...fadeUp(0.1)}
            className="font-display text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-5 sm:mb-6 leading-[0.95] md:leading-[0.9]"
          >
            CastKit
            <br />
            <span className="gradient-text">Web3 Developer Showcase</span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            {...fadeUp(0.2)}
            className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-xl sm:max-w-2xl mx-auto leading-relaxed font-medium"
          >
            Turn social posts into executable mini-apps powered by Web3 payments,
            AI-ranked feeds, and a modular SDK. Ship in hours, not weeks.
          </motion.p>

          {/* CTAs */}
          <motion.div
            {...fadeUp(0.3)}
            className="flex flex-col xs:flex-row items-center justify-center gap-3 sm:gap-4 mb-14 sm:mb-20"
          >
            <Button
              render={<Link href="/explore" />}
              size="lg"
              className="w-full xs:w-auto h-12 px-6 sm:px-8 font-mono bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all text-sm sm:text-base"
            >
              Explore Projects <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              render={<Link href="/docs" />}
              size="lg"
              variant="outline"
              className="w-full xs:w-auto h-12 px-6 sm:px-8 font-mono border-border/60 hover:bg-white/5 text-muted-foreground hover:text-foreground transition-all text-sm sm:text-base"
            >
              Read the Docs
            </Button>
          </motion.div>

          {/* Terminal */}
          <motion.div {...fadeUp(0.4)} className="w-full max-w-2xl lg:max-w-3xl mx-auto">
            <TerminalTyper />
          </motion.div>
        </div>
      </section>

      {/* ── STATS ROW ─────────────────────────── */}
      <section className="w-full border-y border-border/40 bg-card/20">
        <div className="container mx-auto px-4 md:px-6 py-10 sm:py-14">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {STATS.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="flex flex-col items-center sm:items-start text-center sm:text-left gap-2"
                >
                  <Icon className="w-5 h-5 text-primary/60 hidden sm:block" />
                  <div className="text-3xl sm:text-4xl font-black font-display tracking-tighter text-foreground">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground font-mono leading-snug">{stat.label}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── MINI-APP DEMOS ────────────────────── */}
      <section className="w-full py-20 sm:py-28 md:py-32">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <p className="text-xs font-mono text-primary uppercase tracking-widest mb-3">Live Examples</p>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter mb-4">
              Post It. <span className="text-primary">Run It.</span>
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto text-base sm:text-lg">
              Live embedded mini-apps straight from the feed — one click to execute
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
            {[
              { emoji: "☕", title: "Coffee Tip", desc: "Send USDC in 1 click", cta: "Tip $5 USDC", color: "primary" },
              { emoji: "🎨", title: "NFT Drop", desc: "Mint directly from feed", cta: "Mint for 0.01 ETH", color: "secondary" },
              { emoji: "🔒", title: "DM Unlock", desc: "Gated messaging", cta: "Pay to Message", color: "accent" },
              { emoji: "⚖️", title: "DAO Vote", desc: "Inline governance", cta: null, color: "destructive" },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="group glass rounded-2xl border border-border/40 hover:border-border/80 p-5 sm:p-6 flex flex-col gap-4 cursor-pointer hover:scale-[1.02] transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-${item.color}/10 flex items-center justify-center text-xl sm:text-2xl group-hover:scale-110 transition-transform duration-300`}>
                    {item.emoji}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm sm:text-base">{item.title}</h3>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
                {item.cta ? (
                  <Button className={`w-full text-xs sm:text-sm h-9 sm:h-10 bg-${item.color} text-${item.color}-foreground hover:opacity-90 font-mono transition-opacity`}>
                    {item.cta}
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 h-9 text-xs border-green-500/30 text-green-500 hover:bg-green-500/10 font-mono">Yes</Button>
                    <Button variant="outline" className="flex-1 h-9 text-xs border-red-500/30 text-red-500 hover:bg-red-500/10 font-mono">No</Button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES (awsmd-style) ─────────────── */}
      <section className="w-full bg-card/20 border-y border-border/40 py-20 sm:py-28 md:py-32">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 sm:mb-16 max-w-2xl"
          >
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">What We Offer</p>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter mb-4">
              Developer Tools
              <br />
              <span className="gradient-text">Built Differently</span>
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
              Everything you need to build and scale Web3 social primitives — from SDK to smart contracts.
            </p>
          </motion.div>

          <div className="flex flex-col gap-3 sm:gap-4">
            {SERVICES.map((svc, i) => {
              const Icon = svc.icon;
              const isHovered = hoveredService === svc.id;
              return (
                <motion.div
                  key={svc.id}
                  initial={{ opacity: 0, x: -24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className={`group relative rounded-2xl border ${svc.borderColor} bg-card/30 hover:bg-card/60 backdrop-blur-sm p-5 sm:p-7 cursor-pointer transition-all duration-300`}
                  onMouseEnter={() => setHoveredService(svc.id)}
                  onMouseLeave={() => setHoveredService(null)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-card border border-border/50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg ${svc.glowColor}`}>
                      <Icon className={`w-6 h-6 ${svc.color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-display font-black text-lg sm:text-xl">{svc.title}</h3>
                        <span className="text-xs text-muted-foreground font-mono">{svc.subtitle}</span>
                      </div>
                      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed line-clamp-2 sm:line-clamp-none">
                        {svc.desc}
                      </p>
                    </div>

                    {/* Tech tags — appear on hover (visible on mobile always) */}
                    <div className={`flex flex-wrap gap-2 sm:flex-nowrap sm:shrink-0 sm:transition-all sm:duration-300 ${isHovered ? 'sm:opacity-100 sm:translate-x-0' : 'sm:opacity-0 sm:translate-x-4'}`}>
                      {svc.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono border border-border/50 bg-background/80 ${svc.color}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <ChevronRight className={`hidden sm:block w-5 h-5 text-muted-foreground shrink-0 transition-all duration-300 ${isHovered ? 'translate-x-1 opacity-100' : 'opacity-30'}`} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────── */}
      <section className="w-full py-20 sm:py-28 md:py-32">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">The Flow</p>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter mb-4">
              How CastKit Works
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-base sm:text-lg">
              The lifecycle of a Web3 social mini-app action — from scroll to signature.
            </p>
          </motion.div>

          {/* Steps — vertical on mobile, alternating on desktop */}
          <div className="relative max-w-3xl mx-auto">
            <div className="absolute left-5 sm:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-secondary/30 to-accent/10" />

            {[
              { step: 1, title: "User scrolls feed", desc: "Native social timeline rendered by Next.js App Router." },
              { step: 2, title: "Post contains miniApp", desc: "Metadata indicates this post requires an interactive frame." },
              { step: 3, title: "Frontend sandboxes it", desc: "Secure iframe isolates execution environment." },
              { step: 4, title: "User interacts", desc: "Clicks 'Mint' or 'Tip', signs message via viem." },
              { step: 5, title: "Backend verifies", desc: "POST /api/miniapp/:id/action verifies signature on-chain." },
              { step: 6, title: "UI updates", desc: "CastKit SDK communicates success back to the host UI." },
            ].map((item, idx) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08, duration: 0.5 }}
                className={`relative flex items-start sm:items-center gap-6 mb-8 sm:mb-10 pl-12 sm:pl-0 ${idx % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse'
                  }`}
              >
                {/* Content */}
                <div className={`flex-1 sm:max-w-[42%] p-4 sm:p-6 rounded-2xl glass border border-border/40 ${idx % 2 !== 0 ? 'sm:text-right' : ''}`}>
                  <h4 className="font-display font-black text-base sm:text-lg mb-1.5">{item.title}</h4>
                  <p className="text-muted-foreground text-xs sm:text-sm font-mono leading-relaxed">{item.desc}</p>
                </div>

                {/* Step bubble */}
                <div className="absolute left-0 sm:static z-10 bg-background border-2 border-primary w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-primary font-mono text-sm shrink-0 shadow-lg shadow-primary/20">
                  {item.step}
                </div>

                {/* Desktop spacer on even rows */}
                <div className="hidden sm:block flex-1 sm:max-w-[42%]" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TECH STACK ────────────────────────── */}
      <section className="w-full bg-primary/5 border-t border-border/40 py-20 sm:py-28">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 sm:mb-16"
          >
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">Architecture</p>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter">
              The Monorepo Engine
            </h2>
          </motion.div>

          <div className="max-w-2xl mx-auto flex flex-col gap-3 sm:gap-4">
            {[
              { label: "Front-End", tech: "Next.js 16 · shadcn/ui · Zustand · Wagmi", color: "primary", },
              { label: "Backend", tech: "Express · Supabase · Webhooks · Stripe", color: "secondary" },
              { label: "Web3", tech: "Ethers · Viem · Smart Contracts · RPC", color: "accent" },
              { label: "ML", tech: "FastAPI · PyTorch · AI-Ranked Feeds · Moderation", color: "blue-400" },
            ].map((layer, i) => (
              <motion.div
                key={layer.label}
                initial={{ opacity: 0, scale: 0.97 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className={`p-4 sm:p-5 rounded-xl border border-${layer.color}/20 bg-background/60 hover:bg-${layer.color}/5 transition-colors cursor-default group`}
              >
                <h4 className={`font-mono font-bold text-${layer.color} text-sm mb-1`}>{layer.label}</h4>
                <p className="text-xs text-muted-foreground">{layer.tech}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ────────────────────────── */}
      <section className="w-full py-20 sm:py-28 md:py-32">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl border border-primary/20 bg-card/30 p-10 sm:p-16 md:p-20 text-center"
          >
            {/* BG glow */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/8 rounded-full blur-[80px]" />
            </div>

            <div className="relative z-10">
              <p className="text-xs font-mono text-primary uppercase tracking-widest mb-4">Get Started</p>
              <h2 className="font-display text-3xl sm:text-5xl md:text-6xl font-black tracking-tighter mb-5 leading-tight">
                Ready to Build
                <br />
                <span className="shimmer-text">the Future?</span>
              </h2>
              <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto mb-8 sm:mb-10 leading-relaxed">
                Join 8,400+ developers shipping Web3 social mini-apps on CastKit. Free to start, built to scale.
              </p>
              <div className="flex flex-col xs:flex-row items-center justify-center gap-3 sm:gap-4">
                <Button
                  render={<Link href="/submit" />}
                  size="lg"
                  className="w-full xs:w-auto h-12 sm:h-14 px-8 sm:px-10 font-mono bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/30 hover:shadow-primary/50 transition-all text-sm sm:text-base"
                >
                  Submit Your App <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  render={<Link href="/explore" />}
                  size="lg"
                  variant="outline"
                  className="w-full xs:w-auto h-12 sm:h-14 px-8 sm:px-10 font-mono border-border/60 hover:bg-white/5 transition-all text-sm sm:text-base"
                >
                  Browse Projects
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
