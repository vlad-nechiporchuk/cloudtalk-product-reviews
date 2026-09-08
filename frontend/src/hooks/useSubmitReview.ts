import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/client';

export interface SubmitReviewInput {
  productId: string;
  rating: number;
  title?: string;
  body: string;
  photoUrls: string[];
}

// Keep this client type in sync with the backend response.
interface CreatedReview {
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
}

export function useSubmitReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SubmitReviewInput) =>
      apiFetch<CreatedReview>('/reviews', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
    },
  });
}
