import { StarIcon } from './StarIcon';

interface Props {
  averageRating: number | null;
  reviewCount: number;
  ratingCounts: [number, number, number, number, number];
  rating: number | undefined;
  onRatingChange: (rating: number | undefined) => void;
}

export function RatingSummary({
  averageRating,
  reviewCount,
  ratingCounts,
  rating: selectedRating,
  onRatingChange,
}: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="font-sora text-[42px] leading-none font-extrabold text-text-primary">
        {averageRating?.toFixed(1) ?? '—'}
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <StarIcon key={n} filled={n <= Math.round(averageRating ?? 0)} size={19} />
        ))}
      </div>
      <div className="text-sm text-text-secondary">
        Based on {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
      </div>
      <div className="mt-3 flex flex-col gap-1">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = ratingCounts[star - 1];
          const pct = reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0;
          const active = selectedRating === star;

          return (
            <button
              key={star}
              type="button"
              disabled={reviewCount === 0}
              aria-pressed={active}
              aria-label={`Show only ${star}-star reviews (${count})`}
              onClick={() => onRatingChange(active ? undefined : star)}
              className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm disabled:cursor-default ${
                active ? 'bg-accent-bg' : 'hover:enabled:bg-bg-muted'
              }`}
            >
              <span className="w-9 shrink-0 text-xs text-text-secondary">{star} star</span>
              <span className="h-2 grow overflow-hidden rounded-full bg-bg-muted">
                <span className="block h-full rounded-full bg-star-fill" style={{ width: `${pct}%` }} />
              </span>
              <span className="w-7 shrink-0 text-right text-xs text-text-secondary">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
