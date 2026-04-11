"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Eye, AlertTriangle, KeySquare } from "lucide-react";

export default function AdminOverview() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1">System Overview</h1>
        <p className="text-muted-foreground font-mono">Platform vital signs and high-level KPIs.</p>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Daily Active Users", value: "24.5K", diff: "+12%", icon: Users, color: "text-primary bg-primary/10" },
          { title: "Avg Session Length", value: "8m 42s", diff: "+1.2%", icon: Eye, color: "text-secondary bg-secondary/10" },
          { title: "Failed Auth Attempts", value: "1,204", diff: "+42%", icon: KeySquare, color: "text-yellow-500 bg-yellow-500/10" },
          { title: "Flagged Content", value: "89", diff: "-5%", icon: AlertTriangle, color: "text-destructive bg-destructive/10" },
        ].map(kpi => (
          <Card key={kpi.title} className="border-border/50 bg-[#0c0c0c]">
            <CardContent className="p-5 flex flex-col items-start gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${kpi.color}`}>
                <kpi.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-2xl mb-1">{kpi.value}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">{kpi.title}</span>
                  <Badge variant="outline" className={`font-mono text-[10px] px-1 bg-transparent border-none ${kpi.diff.includes('+') ? 'text-green-500' : 'text-red-500'}`}>{kpi.diff}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50 bg-[#0c0c0c] flex-1">
          <CardHeader>
            <CardTitle className="font-display">Recent Approvals Queue</CardTitle>
            <CardDescription className="font-mono text-xs">Apps waiting for manual review.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-mono text-muted-foreground p-8 text-center border border-dashed border-border/50 rounded-lg">
              Queue is currently empty.
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-[#0c0c0c] flex-1">
          <CardHeader>
            <CardTitle className="font-display">System Health</CardTitle>
            <CardDescription className="font-mono text-xs">Monorepo Engine Status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Frontend (Next.js)", status: "Operational", ping: "45ms" },
                { name: "Backend APIs", status: "Operational", ping: "112ms" },
                { name: "ML Microservice", status: "Degraded", ping: "850ms" },
                { name: "Web3 RPC Nodes", status: "Operational", ping: "22ms" },
              ].map(svc => (
                 <div key={svc.name} className="flex items-center justify-between p-3 rounded bg-card/30 border border-border/30">
                   <div className="font-medium text-sm">{svc.name}</div>
                   <div className="flex items-center gap-4">
                     <span className="text-xs text-muted-foreground font-mono">{svc.ping}</span>
                     <Badge className={svc.status === 'Operational' ? 'bg-primary/20 text-primary border-none' : 'bg-yellow-500/20 text-yellow-500 border-none'}>
                       {svc.status}
                     </Badge>
                   </div>
                 </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
