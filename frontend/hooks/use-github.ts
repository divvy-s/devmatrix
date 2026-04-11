import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

export type GitHubRepo = {
  id: number;
  full_name: string;
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  private: boolean;
};

export function useGitHubRepos() {
  const { data: session, status } = useSession();
  const ghToken = (session as any)?.githubAccessToken;

  return useQuery<GitHubRepo[]>({
    queryKey: ["github", "repos"],
    queryFn: async () => {
      const res = await fetch(
        "https://api.github.com/user/repos?sort=updated&per_page=30&type=owner",
        {
          headers: {
            Authorization: `Bearer ${ghToken}`,
            Accept: "application/vnd.github+json",
          },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch GitHub repos");
      return res.json();
    },
    enabled: status === "authenticated" && !!ghToken,
    staleTime: 5 * 60 * 1000,
  });
}
