import Image from "next/image";

interface AvatarProps {
  src?: string;
  alt: string;
  size?: "sm" | "md";
}

export function Avatar({ src, alt, size = "md" }: AvatarProps) {
  const dimensions = size === "sm" ? 32 : 40;
  const initials = alt ? alt.slice(0, 2).toUpperCase() : "U";

  return (
    <div 
      className="relative shrink-0 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700"
      style={{ width: dimensions, height: dimensions }}
    >
      {src ? (
        <Image src={src} alt={alt} fill className="object-cover" />
      ) : (
        <span className="text-zinc-400 font-medium tracking-wider text-xs">
          {initials}
        </span>
      )}
    </div>
  );
}
