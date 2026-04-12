import { PostCardSkeleton } from "@/components/feed/PostCardSkeleton";

export default function Loading() {
  return (
    <div className="w-full flex justify-center">
      <div className="max-w-2xl w-full flex flex-col gap-4">
        <PostCardSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    </div>
  );
}
