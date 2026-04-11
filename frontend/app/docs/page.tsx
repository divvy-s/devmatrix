"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Copy, Terminal, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export default function DocsPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText("npx create-castkit-app@latest my-app");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const SIDEBAR_LINKS = [
    { section: "Getting Started", links: ["Introduction", "Quick Start", "Installation"] },
    { section: "SDK Reference", links: ["useCastKit", "MiniApp Context", "Web3 Helpers"] },
    { section: "Architecture", links: ["Sandboxing", "Event Hooks", "Storage Namespace"] },
    { section: "Permissions", links: ["Requesting Scopes", "Delegation Protocol"] }
  ];

  return (
    <div className="container mx-auto px-4 max-w-7xl flex flex-col md:flex-row gap-8 py-8 items-start relative">
      
      {/* LEFT SIDEBAR */}
      <aside className="w-full md:w-64 shrink-0 md:sticky md:top-24 max-md:hidden">
        <div className="mb-8">
          <h3 className="font-display font-bold text-xl mb-4">Documentation</h3>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search docs (⌘K)" 
              className="w-full bg-[#0c0c0c] border border-border/50 rounded-lg text-sm px-3 py-2 text-foreground font-mono placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        <nav className="flex flex-col gap-6">
          {SIDEBAR_LINKS.map(sec => (
            <div key={sec.section}>
              <h4 className="font-bold text-sm mb-2 text-foreground">{sec.section}</h4>
              <ul className="flex flex-col gap-1.5 border-l border-border/30 pl-2 ml-1">
                {sec.links.map(link => (
                  <li key={link}>
                    <Link href="#" className={`text-sm hover:text-primary transition-colors ${link === "Quick Start" ? "text-primary font-medium" : "text-muted-foreground"}`}>
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* MAIN DOC CONTENT */}
      <main className="flex-1 min-w-0 prose prose-invert prose-pre:bg-[#0c0c0c] prose-pre:border prose-pre:border-border/50 max-w-3xl">
         <h1 className="font-display font-bold tracking-tight text-4xl mb-4">Quick Start</h1>
         <p className="text-xl text-muted-foreground mb-8">
           Get up and running with CastKit in less than 5 minutes.
         </p>

         <div className="space-y-8">
           <section>
             <h2 className="font-display font-bold text-2xl mb-4 pb-2 border-b border-border/30">1. Initialize a new project</h2>
             <p className="text-muted-foreground leading-relaxed mb-4">
               The easiest way to start building a CastKit mini-app is to use the official CLI. This will scaffold a Next.js application pre-configured with the CastKit SDK, shadcn/ui, and Wagmi.
             </p>

             <div className="group relative rounded-xl bg-[#0c0c0c] border border-border/50 overflow-hidden mb-6">
               <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-[#141414]">
                 <div className="flex items-center gap-2">
                   <Terminal className="w-4 h-4 text-muted-foreground" />
                   <span className="text-xs font-mono text-muted-foreground">bash</span>
                 </div>
                 <Button onClick={handleCopy} variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground">
                   {copied ? <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-primary" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                   {copied ? "Copied" : "Copy"}
                 </Button>
               </div>
               <div className="p-4 overflow-x-auto text-sm font-mono text-primary/90">
                 npx create-castkit-app@latest my-app
               </div>
             </div>
           </section>

           <section>
             <h2 className="font-display font-bold text-2xl mb-4 pb-2 border-b border-border/30">2. Configure your manifest</h2>
             <p className="text-muted-foreground leading-relaxed mb-4">
               Open the generated project and locate the <code className="bg-muted px-1.5 py-0.5 rounded text-primary">castkit.config.ts</code> file. This file dictates your mini-app's identity and required permissions.
             </p>

             <div className="group relative rounded-xl bg-[#0c0c0c] border border-border/50 overflow-hidden mb-6">
               <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-[#141414]">
                 <span className="text-xs font-mono text-muted-foreground">castkit.config.ts</span>
                 <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground">
                   <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                 </Button>
               </div>
               <pre className="p-4 overflow-x-auto text-sm font-mono m-0 bg-transparent text-foreground/80">
<span className="text-accent">import</span> {'{'} defineConfig {'}'} <span className="text-accent">from</span> <span className="text-green-400">'@castkit/config'</span>;

<span className="text-accent">export default</span> defineConfig({'{'}
  name: <span className="text-green-400">'My Web3 App'</span>,
  description: <span className="text-green-400">'A social tipping widget'</span>,
  permissions: [<span className="text-green-400">'wallet.requestSign'</span>, <span className="text-green-400">'post.write'</span>],
  entrypoint: <span className="text-green-400">'./src/main.tsx'</span>,
{'}'});
               </pre>
             </div>
           </section>
         </div>
      </main>

      {/* RIGHT SIDEBAR ON-PAGE NAV */}
      <aside className="w-48 hidden xl:block shrink-0 sticky top-24">
        <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-4">On this page</h4>
        <ul className="flex flex-col gap-2 text-sm">
          <li><a href="#" className="text-primary hover:underline">1. Initialize a new project</a></li>
          <li><a href="#" className="text-muted-foreground hover:text-foreground">2. Configure your manifest</a></li>
          <li><a href="#" className="text-muted-foreground hover:text-foreground">3. Start the dev server</a></li>
          <li><a href="#" className="text-muted-foreground hover:text-foreground">4. Deploy</a></li>
        </ul>
      </aside>

    </div>
  );
}
