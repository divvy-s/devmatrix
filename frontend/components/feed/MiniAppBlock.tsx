"use client";
import { MiniApp } from "@/lib/types";
import { triggerMiniAppAction } from "@/lib/api";
import { useState } from "react";
import { useBackendToken } from "@/hooks/use-api";
import { LoadingSpinner } from "../shared/LoadingSpinner";
import Image from "next/image";

export function MiniAppBlock({ miniApp }: { miniApp?: MiniApp }) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const token = useBackendToken();

  if (!miniApp) return null;

  const handleAction = async () => {
    setLoading(true);
    try {
      await triggerMiniAppAction(miniApp.appId, "open", undefined, token);
      setToast("App launched");
    } catch {
      setToast("Error launching app");
    } finally {
      setLoading(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="mt-3 relative rounded-xl border border-zinc-700 bg-zinc-800/50 p-3 pl-4 overflow-hidden flex items-center justify-between">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500" />
      <div className="flex items-center gap-3">
        {miniApp.thumbnail ? (
          <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
             <Image src={miniApp.thumbnail} alt={miniApp.label || "App"} fill className="object-cover" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center shrink-0">
            <span className="text-zinc-500 text-xs">APP</span>
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-zinc-200">{miniApp.appId}</span>
          <span className="text-xs text-zinc-500 uppercase">{miniApp.type}</span>
        </div>
      </div>
      <div className="flex flex-col items-end">
        <button
          onClick={handleAction}
          disabled={loading}
          className="bg-zinc-700 hover:bg-zinc-600 text-zinc-100 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
        >
          {loading ? <LoadingSpinner size="sm" /> : (miniApp.label ?? "Open App")}
        </button>
        {toast && (
           <span className="text-[10px] text-zinc-400 mt-1 absolute -bottom-4 right-3 animate-pulse">{toast}</span>
        )}
      </div>
    </div>
  );
}
