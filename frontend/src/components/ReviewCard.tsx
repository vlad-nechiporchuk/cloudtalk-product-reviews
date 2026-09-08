import type { ReviewItem } from '../hooks/useReviews';
import { useHelpfulVote } from '../hooks/useHelpfulVote';
import { ApiError } from '../api/client';
import { StarIcon } from './StarIcon';

interface Props {
  review: ReviewItem;
}

function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function ReviewCard({ review }: Props) {
  const vote = useHelpfulVote(review.id);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-bg-soft text-sm font-bold text-accent">
            {initialsOf(review.userName)}
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-text-primary">{review.userName}</span>
              {review.isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-success">
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden="true"
                  >
                    <path d="M9 12l2 2 4-4" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                  Verified Purchase
                </span>
              )}
            </div>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <StarIcon key={n} filled={n <= review.rating} size={13} />
              ))}
            </div>
          </div>
        </div>
        <time dateTime={review.createdAt} className="shrink-0 text-xs text-text-tertiary">
          {new Date(review.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </time>
      </div>
      <span className="sr-only">{review.rating} out of 5 stars</span>
      {review.title && <strong className="text-[15px] font-bold text-text-heading">{review.title}</strong>}
      <p className="m-0 text-sm leading-relaxed text-text-body">{review.body}</p>
      {review.photoUrls.length > 0 && (
        <div className="flex gap-2">
          {review.photoUrls.map((url, i) => (
            <img
              key={`${review.id}-${i}`}
              src={url}
              alt="Photo from this review"
              width={64}
              height={64}
              className="h-16 w-16 rounded-lg border border-border-subtle object-cover"
            />
          ))}
        </div>
      )}
      <div className="flex items-center gap-3 pt-0.5">
        <button
          type="button"
          onClick={() => vote.mutate()}
          disabled={vote.isPending}
          className="inline-flex items-center gap-1.5 rounded-full bg-bg-muted px-3.5 py-1.5 text-xs font-semibold text-text-secondary disabled:cursor-default"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M7 10v11H4a1 1 0 01-1-1v-9a1 1 0 011-1h3zm0 0l5-7a2 2 0 013.6 1.7L14 10h5a2 2 0 012 2.3l-1.4 7A2 2 0 0117.6 21H9a2 2 0 01-2-2" />
          </svg>
          Helpful ({review.helpfulCount})
        </button>
        {vote.isError && (
          <span role="alert" className="text-xs text-danger">
            {vote.error instanceof ApiError ? vote.error.message : "Couldn't record your vote."}
          </span>
        )}
      </div>
    </div>
  );
}
