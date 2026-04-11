import { useInfiniteQuery } from '@tanstack/react-query';
import { apiGet, PaginatedResponse } from '@/lib/api';
import { useBackendToken } from './use-api';
import { useSession } from 'next-auth/react';

export type App = {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: string;
  tags: string[];
  stars: number;
  installs: number;
  creator: { username: string; avatarUrl?: string | null };
};

export function useApprovedApps() {
  const token = useBackendToken();
  return useInfiniteQuery({
    queryKey: ['apps', 'approved'],
    queryFn: async ({ pageParam }) => {
      const cursorParam = pageParam ? `?cursor=${pageParam}` : '';
      return apiGet<PaginatedResponse<App>>(`/api/apps${cursorParam}`, { token });
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : null,
  });
}

export function useMyApps() {
  const { status } = useSession();
  const token = useBackendToken();
  return useInfiniteQuery({
    queryKey: ['apps', 'developer', 'me'],
    queryFn: async ({ pageParam }) => {
      const cursorParam = pageParam ? `?cursor=${pageParam}` : '';
      return apiGet<PaginatedResponse<App>>(`/api/apps/developer/me${cursorParam}`, { token });
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : null,
    enabled: status === 'authenticated' && !!token,
  });
}
