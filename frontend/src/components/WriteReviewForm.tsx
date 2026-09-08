import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSubmitReview } from '../hooks/useSubmitReview';
import { ApiError } from '../api/client';
import { StarIcon } from './StarIcon';

interface Props {
  productId: string;
  productName: string;
  onDone: () => void;
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className="absolute top-3.5 right-3.5 text-text-secondary"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M5 5l14 14M19 5L5 19" />
      </svg>
    </button>
  );
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function WriteReviewForm({ productId, productName, onDone }: Props) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const submit = useSubmitReview();
  const panelRef = useRef<HTMLDivElement>(null);

  const photoUrlValid = photoUrl.trim() === '' || URL.canParse(photoUrl.trim());
  const canSubmit = rating > 0 && body.trim().length > 0 && photoUrlValid;

  // Focus trap + Escape-to-close + focus restoration — a role="dialog"
  // implies all three, and a modal with none of them lets Tab escape into
  // the (still-focusable, just visually covered) page behind the scrim.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onDone();

        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) {
        return;
      }

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (e: FormEvent): void => {
    e.preventDefault();

    submit.mutate({
      productId,
      rating,
      title: title.trim() || undefined,
      body: body.trim(),
      photoUrls: photoUrl.trim() ? [photoUrl.trim()] : [],
    });
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-6"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Write a review"
        tabIndex={-1}
        className="relative my-auto max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-2xl bg-surface p-7"
      >
        <CloseButton onClick={onDone} />

        {submit.isSuccess ? (
          <div className="flex flex-col items-center gap-3.5 py-5 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-bg">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                className="text-success"
                aria-hidden="true"
              >
                <path d="M5 13l4 4 10-10" />
              </svg>
            </div>
            <h2 className="font-sora m-0 text-lg font-bold text-text-primary">
              Thanks for your review!
            </h2>
            <p className="m-0 max-w-[320px] text-sm text-text-secondary">
              It helps other shoppers make better decisions — and it just went live at the top of
              the list.
            </p>
            <button
              type="button"
              onClick={onDone}
              className="mt-1.5 rounded-lg bg-accent px-5.5 py-2.5 text-sm font-semibold text-white"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div>
              <h2 className="font-sora m-0 mb-1 text-lg font-bold text-text-primary">
                Write a review
              </h2>
              <p className="m-0 text-[13px] text-text-secondary">
                Share your honest experience with {productName}.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label id="review-rating-label" className="text-[13px] font-semibold text-text-primary">
                Your rating
              </label>
              <div
                role="radiogroup"
                aria-labelledby="review-rating-label"
                onMouseLeave={() => setHoverRating(0)}
                className="flex gap-1"
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    role="radio"
                    aria-checked={star === rating}
                    aria-label={`${star} star`}
                  >
                    <StarIcon filled={star <= (hoverRating || rating)} size={28} />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-text-primary" htmlFor="review-title">
                Title (optional)
              </label>
              <input
                id="review-title"
                placeholder="Summarize your experience"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                className="rounded-lg border border-border-light px-3 py-2.5 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-text-primary" htmlFor="review-body">
                Your review
              </label>
              <textarea
                id="review-body"
                placeholder="What did you like or dislike? What should other shoppers know?"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={2000}
                rows={4}
                className="resize-y rounded-lg border border-border-light px-3 py-2.5 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-text-primary" htmlFor="review-photo">
                Photo URL (optional)
              </label>
              <input
                id="review-photo"
                placeholder="https://…"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="rounded-lg border border-border-light px-3 py-2.5 text-sm"
              />
              {!photoUrlValid && (
                <p className="m-0 text-xs text-danger">Enter a valid URL, or leave it blank.</p>
              )}
            </div>

            {submit.isError && (
              <p role="alert" className="m-0 text-sm text-danger">
                {submit.error instanceof ApiError
                  ? submit.error.message
                  : 'Something went wrong — try again.'}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit || submit.isPending}
              className="rounded-lg bg-accent px-4.5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submit.isPending ? 'Posting…' : 'Post review'}
            </button>
            <span className="-mt-2 text-xs text-text-tertiary">
              A star rating and a few words help other shoppers most.
            </span>
          </form>
        )}
      </div>
    </div>
  );
}
