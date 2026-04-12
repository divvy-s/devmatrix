import { User } from "@/lib/types";
import { Avatar } from "../shared/Avatar";
import { FollowButton } from "./FollowButton";

export function UserCard({ user }: { user: User }) {
  return (
    <div className="flex items-center justify-between p-3 hover:bg-zinc-800/50 transition-colors border-b border-zinc-800 last:border-0 rounded-lg">
      <div className="flex items-center gap-3 overflow-hidden">
        <Avatar src={user.avatar} alt={user.username} size="sm" />
        <div className="flex flex-col truncate">
          <span className="font-medium text-sm text-zinc-100 truncate">{user.username}</span>
          {user.bio && <span className="text-xs text-zinc-500 truncate">{user.bio}</span>}
        </div>
      </div>
      <FollowButton userId={user.id} initialIsFollowing={user.isFollowing} />
    </div>
  );
}
