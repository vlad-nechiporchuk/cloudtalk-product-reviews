import type { SortMode } from '../hooks/useReviews';

interface Props {
  sort: SortMode;
  onSortChange: (sort: SortMode) => void;
  verified: boolean;
  onVerifiedChange: (verified: boolean) => void;
  rating: number | undefined;
  onRatingChange: (rating: number | undefined) => void;
}

export function SortFilterBar({
  sort,
  onSortChange,
  verified,
  onVerifiedChange,
  rating,
  onRatingChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {rating !== undefined && (
        <button
          type="button"
          onClick={() => onRatingChange(undefined)}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent-bg px-2.5 py-1 text-xs font-semibold text-accent"
        >
          {rating} star only
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            aria-hidden="true"
          >
            <path d="M4 4l16 16M20 4L4 20" />
          </svg>
        </button>
      )}
      <label className="flex items-center gap-1.5 text-sm text-text-secondary">
        <input
          type="checkbox"
          checked={verified}
          onChange={(e) => onVerifiedChange(e.target.checked)}
          className="accent-accent"
        />
        Verified purchases only
      </label>
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as SortMode)}
        className="ml-auto rounded-lg border border-border-light bg-surface px-2.5 py-1.5 text-sm text-text-primary"
      >
        <option value="newest">Most recent</option>
        <option value="highest_rated">Highest rated</option>
      </select>
    </div>
  );
}
