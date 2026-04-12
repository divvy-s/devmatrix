export function PostCardSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-zinc-800" />
        <div className="flex flex-col gap-2">
          <div className="w-24 h-4 rounded bg-zinc-800" />
          <div className="w-16 h-3 rounded bg-zinc-800/80" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="w-full h-4 rounded bg-zinc-800" />
        <div className="w-full h-4 rounded bg-zinc-800" />
        <div className="w-2/3 h-4 rounded bg-zinc-800" />
      </div>
      <div className="w-full h-48 rounded-xl bg-zinc-800" />
      <div className="flex items-center gap-4 mt-2">
        <div className="w-12 h-6 rounded bg-zinc-800" />
        <div className="w-12 h-6 rounded bg-zinc-800" />
      </div>
    </div>
  );
}
