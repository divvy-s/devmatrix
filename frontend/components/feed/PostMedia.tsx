import Image from "next/image";

export function PostMedia({ assets }: { assets?: string[] }) {
  if (!assets || assets.length === 0) return null;

  const gridCols = assets.length === 1 ? "grid-cols-1" :
                   assets.length === 2 ? "grid-cols-2" :
                   "grid-cols-2";

  return (
    <div className={`grid gap-2 ${gridCols} mt-2 rounded-xl overflow-hidden`}>
      {assets.slice(0, 4).map((asset, i) => (
        <div key={i} className={`relative bg-zinc-800 ${assets.length === 1 ? 'aspect-video' : 'aspect-square'}`}>
          <Image src={asset} alt="Post media" fill className="object-cover" />
        </div>
      ))}
    </div>
  );
}
