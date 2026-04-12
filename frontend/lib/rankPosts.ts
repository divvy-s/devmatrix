import { Post } from "./types";

/**
 * ML Ranking placeholder.
 * 
 * When integrated, the ML model will require:
 * - user FID (Farcaster ID) to determine personalized feed
 * - tag affinity vector (to rank posts matching user's intersts higher)
 * - tip history (to surface creators the user has tipped)
 * - session context (time of day, device, active location)
 */
export function rankPosts(posts: Post[]): Post[] {
  // Pass-through implementation for now.
  return posts;
}
