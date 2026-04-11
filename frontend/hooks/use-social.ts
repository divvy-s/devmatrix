import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiDelete, PaginatedResponse, Author } from '@/lib/api';
import { useBackendToken } from './use-api';

export function useFollowers(username: string) {
  const token = useBackendToken();
  return useInfiniteQuery({
    queryKey: ['followers', username],
    queryFn: async ({ pageParam }) => {
      const cursorParam = pageParam ? `?cursor=${pageParam}` : '';
      return apiGet<PaginatedResponse<Author>>(`/api/social/${username}/followers${cursorParam}`, { token });
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : null,
    enabled: !!username,
  });
}

export function useFollowing(username: string) {
  const token = useBackendToken();
  return useInfiniteQuery({
    queryKey: ['following', username],
    queryFn: async ({ pageParam }) => {
      const cursorParam = pageParam ? `?cursor=${pageParam}` : '';
      return apiGet<PaginatedResponse<Author>>(`/api/social/${username}/following${cursorParam}`, { token });
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : null,
    enabled: !!username,
  });
}

export function useFollow() {
  const token = useBackendToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ username, action }: { username: string; action: 'follow' | 'unfollow' }) => {
      if (action === 'follow') {
        return apiPost(`/api/social/${username}/follow`, { token });
      } else {
        return apiDelete(`/api/social/${username}/follow`, { token });
      }
    },
    onSuccess: (_, { username }) => {
      queryClient.invalidateQueries({ queryKey: ['followers', username] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
    }
  });
}
