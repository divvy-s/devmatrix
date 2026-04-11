import { useInfiniteQuery, useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiGet, apiPost, PaginatedResponse, Post } from '@/lib/api';
import { useBackendToken } from './use-api';

export function useFeed(type: 'following' | 'discovery' | 'trending') {
  const { status } = useSession();
  const token = useBackendToken();

  return useInfiniteQuery({
    queryKey: ['feed', type],
    queryFn: async ({ pageParam }) => {
      const cursorParam = pageParam ? `?cursor=${pageParam}` : '';
      let endpoint = `/api/feed`;
      if (type === 'discovery') endpoint = `/api/feed/discovery`;
      else if (type === 'trending') endpoint = `/api/feed/trending`; // Adjust if the api is different

      return apiGet<PaginatedResponse<Post>>(`${endpoint}${cursorParam}`, { token });
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: PaginatedResponse<Post>) => (lastPage.hasMore ? lastPage.nextCursor : null),
    enabled: type === 'following' ? (status === 'authenticated' && !!token) : true,
    staleTime: 15 * 1000,
  });
}

export function useLikePost() {
  const queryClient = useQueryClient();
  const token = useBackendToken();

  return useMutation({
    mutationFn: async (postId: string) => {
      return apiPost(`/api/posts/${postId}/like`, { token });
    },
    onMutate: async (postId: string) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });

      const previousFeeds = queryClient.getQueriesData<InfiniteData<PaginatedResponse<Post>, string | null>>({
        queryKey: ['feed'],
      });

      queryClient.setQueriesData<InfiniteData<PaginatedResponse<Post>, string | null>>(
        { queryKey: ['feed'] },
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              data: page.data.map((post) => {
                if (post.id === postId) {
                  const currentlyLiked = post.viewerContext?.hasLiked || post.viewerContext?.liked;
                  if (currentlyLiked) return post; // Assuming we don't handle unlike in this specific hook variation
                  return {
                    ...post,
                    likeCount: post.likeCount + 1,
                    viewerContext: {
                      ...post.viewerContext,
                      liked: true,
                      hasLiked: true,
                      reposted: post.viewerContext?.reposted ?? false,
                      bookmarked: post.viewerContext?.bookmarked ?? false,
                    },
                  };
                }
                return post;
              }),
            })),
          };
        }
      );

      return { previousFeeds };
    },
    onError: (err, postId, context) => {
      if (context?.previousFeeds) {
        context.previousFeeds.forEach(([queryKey, oldData]) => {
          if (oldData) {
            queryClient.setQueryData(queryKey, oldData);
          }
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useRepost() {
  const token = useBackendToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      return apiPost(`/api/posts/${postId}/repost`, { token });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useCreatePost() {
  const token = useBackendToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      return apiPost(`/api/posts`, {
        token,
        body: JSON.stringify({ content }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
