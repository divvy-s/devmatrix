import { Author } from "@/lib/types";
import { Avatar } from "../shared/Avatar";
import { FollowButton } from "../social/FollowButton";

interface AuthorInfoProps {
  author: Author;
  createdAt: string;
}

export function AuthorInfo({ author, createdAt }: AuthorInfoProps) {
  const date = new Date(createdAt);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  const timeDisplay = diffInHours > 24 
    ? `${Math.floor(diffInHours / 24)} days ago`
    : diffInHours > 0 
      ? `${diffInHours} hours ago`
      : 'Just now';

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Avatar src={author.avatar} alt={author.username} size="md" />
        <div className="flex flex-col">
          <span className="font-semibold text-zinc-100">{author.username}</span>
          <span className="text-xs text-zinc-500">{timeDisplay}</span>
        </div>
      </div>
      <FollowButton userId={author.id} initialIsFollowing={false} />
    </div>
  );
}
