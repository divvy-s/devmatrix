export function TagPill({ tag }: { tag: string }) {
  return (
    <span className="bg-zinc-800 text-zinc-300 rounded-full px-2 py-0.5 text-xs border border-zinc-700/50 hover:bg-zinc-700 transition-colors cursor-pointer">
      #{tag}
    </span>
  );
}
