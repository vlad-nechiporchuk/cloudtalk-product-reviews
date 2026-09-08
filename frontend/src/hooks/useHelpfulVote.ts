import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/client';

interface HelpfulVoteResult {
  helpfulCount: number;
}

export function useHelpfulVote(reviewId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<HelpfulVoteResult>(`/reviews/${reviewId}/helpful`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
}
