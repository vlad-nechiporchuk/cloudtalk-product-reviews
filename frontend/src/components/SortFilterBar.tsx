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
    <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 pb-3">
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as SortMode)}
        className="rounded-lg border border-neutral-300 px-2 py-1 text-sm"
      >
        <option value="newest">Most recent</option>
        <option value="highest_rated">Highest rated</option>
      </select>
      <label className="flex items-center gap-1.5 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={verified}
          onChange={(e) => onVerifiedChange(e.target.checked)}
        />
        Verified purchases only
      </label>
      {rating !== undefined && (
        <button
          type="button"
          onClick={() => onRatingChange(undefined)}
          className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700"
        >
          {rating} star only ×
        </button>
      )}
    </div>
  );
}
