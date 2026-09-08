import type { ReviewItem } from '../hooks/useReviews';

interface Props {
  review: ReviewItem;
}

export function ReviewCard({ review }: Props) {
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
      <span className="text-xs text-neutral-500">Helpful ({review.helpfulCount})</span>
    </div>
  );
}
