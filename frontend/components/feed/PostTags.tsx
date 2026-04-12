import { TagPill } from "../shared/TagPill";

export function PostTags({ tags }: { tags?: string[] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {tags.map((tag, i) => (
        <TagPill key={i} tag={tag} />
      ))}
    </div>
  );
}
