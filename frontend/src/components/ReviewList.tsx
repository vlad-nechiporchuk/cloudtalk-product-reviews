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
    <div className="flex flex-col gap-3">
      {items.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
      {hasNextPage && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={isFetchingNextPage}
          className="self-center rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          {isFetchingNextPage ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}
