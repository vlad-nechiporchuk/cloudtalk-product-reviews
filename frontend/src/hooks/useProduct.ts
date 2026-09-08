import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';

// Keep this client type in sync with the backend response.
export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  category: string;
  reviewCount: number;
  averageRating: number | null;
  ratingCounts: [number, number, number, number, number];
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: () => apiFetch<ProductSummary>(`/products/${slug}`),
  });
}
