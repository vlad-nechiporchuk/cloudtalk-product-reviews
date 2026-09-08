interface Props {
  onWriteReview: () => void;
}

export function EmptyState({ onWriteReview }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-300 py-12 text-center">
      <p className="text-neutral-600">No reviews yet</p>
      <button
        type="button"
        onClick={onWriteReview}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
      >
        Write the first review
      </button>
    </div>
  );
}
