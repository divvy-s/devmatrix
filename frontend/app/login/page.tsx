"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Zap, Terminal } from "lucide-react";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] },
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] relative overflow-hidden bg-background">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md px-4 md:px-0">
        <motion.div
          {...fadeUp(0)}
          className="flex flex-col items-center justify-center mb-8"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-4">
            <Zap className="w-6 h-6 text-primary drop-shadow-[0_0_10px_rgba(0,255,136,0.8)]" />
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter text-center">
            Log in to <span className="gradient-text">CastKit</span>
          </h1>
          <p className="text-muted-foreground mt-3 font-mono text-sm text-center">
            Sign in with Google to manage your mini-apps.
          </p>
        </motion.div>

        <motion.div
          {...fadeUp(0.1)}
          className="glass border border-border/40 p-8 sm:p-10 rounded-3xl shadow-xl shadow-black/50"
        >
          <div className="flex flex-col gap-6">
            <Button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="w-full h-14 bg-background border border-border hover:border-primary/50 text-foreground font-mono transition-all group relative overflow-hidden"
              variant="outline"
              disabled={status === "loading"}
            >
              <div className="absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <div className="relative flex items-center justify-center gap-3 w-full z-10">
                {/* Google SVG Icon */}
                <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-1 7.28-2.69l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {status === "loading" ? "Loading..." : "Continue with Google"}
              </div>
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/40" />
              </div>
              <div className="relative flex justify-center text-xs font-mono">
                <span className="bg-card px-2 text-muted-foreground/60">secure login</span>
              </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-[#0a0a0a] shadow-inner overflow-hidden">
              <div className="flex items-center px-4 py-2 border-b border-white/5 bg-[#111]">
                <div className="flex items-center text-[10px] font-mono text-muted-foreground">
                  <Terminal className="w-3 h-3 mr-1.5" /> status
                </div>
              </div>
              <div className="p-4 font-mono text-xs leading-relaxed min-h-[60px] text-muted-foreground">
                <div className="flex">
                  <span className="text-primary mr-2 shrink-0">~</span>$ auth_check
                </div>
                {status === "loading" ? (
                  <div className="flex text-primary">
                    <span className="animate-pulse bg-primary w-2 h-[1.1em] mt-[1px] ml-1 inline-block opacity-90 rounded-sm" />
                  </div>
                ) : (
                  <div className="text-yellow-500/80">Pending authentication...</div>
                )}
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </div>
  );
}
