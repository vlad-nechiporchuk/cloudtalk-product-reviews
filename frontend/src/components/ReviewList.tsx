import type { ReviewItem } from '../hooks/useReviews';
import { ReviewCard } from './ReviewCard';

interface Props {
  items: ReviewItem[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}

export function ReviewList({ items, hasNextPage, isFetchingNextPage, onLoadMore }: Props) {
  return (
    <div className="flex flex-col gap-3.5">
      {items.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
      {hasNextPage && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={isFetchingNextPage}
          className="self-center rounded-lg border border-border-light bg-surface px-4 py-2 text-sm font-medium text-text-primary disabled:opacity-50"
        >
          {isFetchingNextPage ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}
