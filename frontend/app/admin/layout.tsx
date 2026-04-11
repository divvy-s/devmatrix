import Link from "next/link";
import { LayoutDashboard, Users, Grid, ShieldAlert, Flag, Activity, Settings2 } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const NAV_ITEMS = [
    { label: "Overview", icon: LayoutDashboard, href: "/admin", active: true },
    { label: "Users", icon: Users, href: "/admin/users" },
    { label: "Apps", icon: Grid, href: "/admin/apps" },
    { label: "Content Queue", icon: Flag, href: "/admin/content" },
    { label: "Risk Monitor", icon: ShieldAlert, href: "/admin/risk" },
    { label: "Settings", icon: Settings2, href: "/admin/settings" },
  ];

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 flex flex-col md:flex-row gap-8 min-h-[80vh]">
      
      {/* SIDEBAR */}
      <aside className="w-full md:w-64 shrink-0">
        <div className="font-display font-bold text-xl mb-6 pb-2 border-b border-border/40 text-destructive flex items-center justify-between">
          <span>God Mode</span>
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
        </div>
        
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link 
              key={item.label} 
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                item.active 
                  ? "bg-primary/20 text-primary border border-primary/20" 
                  : "text-muted-foreground hover:bg-card hover:text-foreground border border-transparent"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* CONTENT PORTAL */}
      <main className="flex-1 min-w-0">
        {children}
      </main>

    </div>
  );
}
