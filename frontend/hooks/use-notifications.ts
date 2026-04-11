import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiGet, apiPost, PaginatedResponse, Notification } from '@/lib/api';
import { useBackendToken } from './use-api';

export function useNotifications() {
  const { status } = useSession();
  const token = useBackendToken();

  return useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: async ({ pageParam }) => {
      const cursorParam = pageParam ? `?cursor=${pageParam}` : '';
      return apiGet<PaginatedResponse<Notification>>(`/api/notifications${cursorParam}`, { token });
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: PaginatedResponse<Notification>) => (lastPage.hasMore ? lastPage.nextCursor : null),
    enabled: status === 'authenticated' && !!token,
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  const token = useBackendToken();

  return useMutation({
    mutationFn: async () => {
      return apiPost('/api/notifications/read-all', { token });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
