import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiGet, Me } from '@/lib/api';
import { useBackendToken } from './use-api';

export function useMe() {
  const { status } = useSession();
  const token = useBackendToken();

  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiGet<Me>('/api/identity/me', { token }),
    enabled: status === 'authenticated' && !!token,
    staleTime: 60 * 1000,
  });
}
