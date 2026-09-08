import type { ReviewItem } from '../hooks/useReviews';
import { useHelpfulVote } from '../hooks/useHelpfulVote';
import { ApiError } from '../api/client';

interface Props {
  review: ReviewItem;
}

export function ReviewCard({ review }: Props) {
  const vote = useHelpfulVote(review.id);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-4">
      <div className="flex items-center gap-2">
        <span className="text-amber-400" aria-hidden="true">
          {'★'.repeat(review.rating)}
          {'☆'.repeat(5 - review.rating)}
        </span>
        <span className="sr-only">{review.rating} out of 5 stars</span>
        {review.isVerified && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            Verified Purchase
          </span>
        )}
        <time dateTime={review.createdAt} className="ml-auto text-xs text-neutral-400">
          {new Date(review.createdAt).toLocaleDateString()}
        </time>
      </div>
      {review.title && <strong className="text-neutral-900">{review.title}</strong>}
      <p className="text-sm text-neutral-700">{review.body}</p>
      {review.photoUrls.length > 0 && (
        <div className="flex gap-2">
          {review.photoUrls.map((url, i) => (
            <img
              key={`${review.id}-${i}`}
              src={url}
              alt="Photo from this review"
              width={64}
              height={64}
              className="h-16 w-16 rounded-lg object-cover"
            />
          ))}
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => vote.mutate()}
          disabled={vote.isPending}
          className="text-xs text-neutral-500 underline disabled:cursor-default disabled:no-underline"
        >
          Helpful ({review.helpfulCount})
        </button>
        {vote.isError && (
          <span role="alert" className="text-xs text-red-600">
            {vote.error instanceof ApiError ? vote.error.message : "Couldn't record your vote."}
          </span>
        )}
      </div>
    </div>
  );
}
