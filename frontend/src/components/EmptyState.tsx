interface Props {
  onWriteReview: () => void;
}

export function EmptyState({ onWriteReview }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border-subtle bg-surface px-6 py-16 text-center">
      <svg width="104" height="104" viewBox="0 0 120 120" fill="none" aria-hidden="true">
        <rect x="16" y="14" width="88" height="62" rx="14" stroke="oklch(82% 0.01 90)" strokeWidth="2.5" />
        <path
          d="M40 76l-6 16 20-16"
          stroke="oklch(82% 0.01 90)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <polygon
          points="46 38 48.4 44.4 55 45.1 50 49.4 51.6 56 46 52.6 40.4 56 42 49.4 37 45.1 43.6 44.4"
          stroke="oklch(78% 0.01 90)"
          strokeWidth="1.6"
          fill="none"
        />
        <polygon
          points="60 32 62.9 39.4 70.5 40.3 64.7 45.3 66.6 52.8 60 48.7 53.4 52.8 55.3 45.3 49.5 40.3 57.1 39.4"
          stroke="oklch(78% 0.01 90)"
          strokeWidth="1.6"
          fill="none"
        />
        <polygon
          points="76 38 78.4 44.4 85 45.1 80 49.4 81.6 56 76 52.6 70.4 56 72 49.4 67 45.1 73.6 44.4"
          stroke="oklch(78% 0.01 90)"
          strokeWidth="1.6"
          fill="none"
        />
      </svg>
      <div className="flex flex-col gap-1.5">
        <div className="font-sora text-[17px] font-bold text-text-primary">No reviews yet</div>
        <p className="m-0 max-w-[340px] text-sm text-text-secondary">
          Be the first to share what you think — your review helps other shoppers decide.
        </p>
      </div>
      <button
        type="button"
        onClick={onWriteReview}
        className="rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white"
      >
        Write the first review
      </button>
    </div>
  );
}
