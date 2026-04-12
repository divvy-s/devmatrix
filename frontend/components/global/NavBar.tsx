"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Icons } from "@/components/global/icons";
import { Wallet, Menu, X, Zap } from "lucide-react";
import { useState } from "react";

import { useSession, signOut, signIn } from "next-auth/react";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { useMounted } from "@/hooks/use-mounted";

const NAV_LINKS = [
  { href: "/feed", label: "Feed" },
  { href: "/assets", label: "Assets" },
  { href: "/docs", label: "Docs" },
  { href: "/submit", label: "Submit App" },
];

export function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();
  const mounted = useMounted();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center group-hover:bg-primary/20 group-hover:border-primary/60 transition-all duration-300">
            <Zap className="w-4 h-4 text-primary group-hover:text-glow-green transition-all duration-300" />
          </div>
          <span className="font-display text-xl font-bold tracking-tighter text-foreground group-hover:text-primary transition-colors duration-300">
            Cast<span className="text-primary">Kit</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex flex-1 items-center justify-center space-x-1 text-sm font-medium">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg transition-all duration-200 ${isActive
                  ? "text-primary bg-primary/10 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => signIn("github", { callbackUrl: pathname })}
            className="group border-border/50 hover:border-accent/50 hover:bg-accent/5 transition-all duration-200"
          >
            <Icons.gitHub className="mr-2 h-4 w-4 group-hover:text-accent transition-colors" />
            GitHub
          </Button>

          {!mounted || status === "loading" ? (
            <div className="w-24 h-9 animate-pulse bg-white/5 rounded-md" />
          ) : session?.user ? (
            <Link href="/profile" className="flex items-center gap-3 border border-border/50 rounded-lg pl-2 pr-1 py-1 bg-card/50 hover:border-primary/40 transition-colors group">
              <span className="text-xs font-mono text-muted-foreground hidden lg:inline-block max-w-[100px] truncate group-hover:text-foreground transition-colors">
                {session.user.name}
              </span>
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt="User Avatar"
                  width={24}
                  height={24}
                  className="rounded-md"
                />
              ) : (
                <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary uppercase">
                  {session.user.name?.substring(0, 2) || "U"}
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.preventDefault(); signOut({ callbackUrl: "/" }); }}
                className="h-6 w-6 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-3 w-3" />
              </Button>
            </Link>
          ) : (
            <Button
              render={<Link href="/login" />}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-200"
            >
              <Wallet className="mr-2 h-4 w-4" />
              Sign In
            </Button>
          )}
        </div>

        {/* Mobile Menu */}
        <div className="flex md:hidden items-center gap-2">
          {!mounted || status === "loading" ? (
            <div className="w-9 h-9 animate-pulse bg-white/5 rounded-md" />
          ) : session?.user ? (
            <Link href="/profile" className="w-9 h-9 relative block">
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt="User Avatar"
                  width={36}
                  height={36}
                  className="rounded-md object-cover border border-border/50"
                />
              ) : (
                <div className="w-9 h-9 rounded-md bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary uppercase">
                  {session.user.name?.substring(0, 2) || "U"}
                </div>
              )}
            </Link>
          ) : (
            <Button
              render={<Link href="/login" />}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono h-9 px-3 text-xs"
            >
              <Wallet className="h-3.5 w-3.5" />
            </Button>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 border-border/50 hover:border-border"
                  aria-label="Open menu"
                />
              }
            >
              <Menu className="h-4 w-4" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] bg-card/95 backdrop-blur-xl border-border/50 p-0">
              {/* Mobile Sheet Header */}
              <div className="flex items-center justify-between p-5 border-b border-border/40">
                <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-display text-lg font-bold tracking-tighter">
                    Cast<span className="text-primary">Kit</span>
                  </span>
                </Link>
              </div>

              {/* Mobile Nav Links */}
              <nav className="flex flex-col p-4 gap-1">
                {NAV_LINKS.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                        ? "text-primary bg-primary/10 font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        }`}
                    >
                      {link.label}
                      {isActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* Mobile Sheet Footer */}
              <div className="absolute bottom-0 left-0 right-0 p-5 border-t border-border/40 flex flex-col gap-3">
                <Button
                  variant="outline"
                  onClick={() => signIn("github", { callbackUrl: pathname })}
                  className="w-full justify-start border-border/50 hover:border-accent/50 hover:bg-accent/5"
                >
                  <Icons.gitHub className="mr-2 h-4 w-4" />
                  Connect GitHub
                </Button>

                {session?.user ? (
                  <Button
                    variant="destructive"
                    onClick={() => { setOpen(false); signOut({ callbackUrl: "/" }); }}
                    className="w-full font-mono shadow-lg shadow-destructive/20"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                ) : (
                  <Button
                    render={<Link href="/login" onClick={() => setOpen(false)} />}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-mono shadow-lg shadow-primary/20"
                  >
                    <Wallet className="mr-2 h-4 w-4" />
                    Sign In
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

      </div>
    </header>
  );
}
