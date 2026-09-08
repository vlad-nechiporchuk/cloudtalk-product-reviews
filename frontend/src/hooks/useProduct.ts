import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';

// Shape matches backend/src/products/product.service.ts's ProductSummary —
// hand-duplicated (no shared package in this take-home), so check there
// when this drifts.
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
