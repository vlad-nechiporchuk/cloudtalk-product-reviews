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
    <div className="flex flex-col gap-3">
      <div className="text-4xl font-extrabold text-neutral-900">
        {averageRating?.toFixed(1) ?? '—'}
      </div>
      <div className="text-sm text-neutral-500">
        {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
      </div>
      <div className="flex flex-col gap-1">
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
              className={`flex items-center gap-2 rounded px-1.5 py-1 text-left text-sm disabled:cursor-default ${
                active ? 'bg-indigo-50' : 'hover:enabled:bg-neutral-50'
              }`}
            >
              <span className="w-12 shrink-0 text-neutral-600">{star} star</span>
              <span className="h-2 grow overflow-hidden rounded-full bg-neutral-200">
                <span
                  className="block h-full rounded-full bg-amber-400"
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="w-6 shrink-0 text-right text-neutral-500">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
