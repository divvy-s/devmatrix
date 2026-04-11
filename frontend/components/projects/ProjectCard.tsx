import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Star, Download, PlayCircle } from "lucide-react";

interface ProjectCardProps {
  id: string;
  name: string;
  creator: { username: string; avatar: string };
  description: string;
  stars: number;
  installs: number;
  tags: string[];
  type: "DeFi" | "Social" | "Gaming" | "Tools" | "AI" | "Web3";
}

export function ProjectCard({ id, name, creator, description, stars, installs, tags, type }: ProjectCardProps) {
  const typeColors = {
    DeFi: "bg-primary/10 text-primary border-primary/20",
    Social: "bg-secondary/10 text-secondary border-secondary/20",
    Gaming: "bg-accent/10 text-accent border-accent/20",
    Tools: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    AI: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    Web3: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  };

  return (
    <Card className="flex flex-col h-full border-border/50 bg-[#0c0c0c] hover:border-primary/50 transition-all group overflow-hidden">
      {/* Thumbnail placeholder */}
      <div className="w-full h-32 bg-muted/30 relative border-b border-border/50 flex items-center justify-center group-hover:bg-muted/50 transition-colors">
        <PlayCircle className="w-8 h-8 text-muted-foreground/50 group-hover:text-primary transition-colors" />
        <Badge variant="outline" className={`absolute top-2 right-2 ${typeColors[type]}`}>
          {type}
        </Badge>
      </div>

      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start mb-2">
          <div className="font-display font-bold text-lg leading-tight truncate">
            {name}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-5 h-5 rounded-full bg-border flex items-center justify-center overflow-hidden">
            {/* Avatar placeholder */}
            <span className="text-[10px] uppercase font-bold">{creator.username.substring(0, 2)}</span>
          </div>
          <span>@{creator.username}</span>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 flex-1">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {description}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-auto">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 bg-secondary/5 text-secondary-foreground font-mono">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex items-center justify-between border-t border-border/20 mt-4">
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
          <span className="flex items-center gap-1"><Star className="w-3 h-3" /> {stars}</span>
          <span className="flex items-center gap-1"><Download className="w-3 h-3" /> {installs}</span>
        </div>
        
        <Link href={`/project/${id}`} className={buttonVariants({ variant: "ghost", size: "sm", className: "h-8 text-xs hover:bg-primary/10 hover:text-primary" })}>
          View
        </Link>
      </CardFooter>
    </Card>
  );
}
