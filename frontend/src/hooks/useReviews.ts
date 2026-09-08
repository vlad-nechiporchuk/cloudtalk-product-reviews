import { useInfiniteQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';

// Keep this client type in sync with the backend response.
export interface ReviewItem {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title: string | null;
  body: string;
  helpfulCount: number;
  isVerified: boolean;
  createdAt: string;
  photoUrls: string[];
}

export interface ReviewsPage {
  items: ReviewItem[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

export type SortMode = 'newest' | 'highest_rated';

export function useReviews(
  productId: string | undefined,
  sort: SortMode,
  rating?: number,
  verified?: boolean,
) {
  return useInfiniteQuery({
    queryKey: ['reviews', productId, sort, rating, verified],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ sort });
      if (rating) {
        params.set('rating', String(rating));
      }
      if (verified) {
        params.set('verified', 'true');
      }
      if (pageParam) {
        params.set('cursor', pageParam);
      }

      return apiFetch<ReviewsPage>(`/products/${productId}/reviews?${params}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.hasNextPage ? (last.nextCursor ?? undefined) : undefined),
    enabled: !!productId,
  });
}
