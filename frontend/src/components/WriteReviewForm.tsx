import { useState, type FormEvent } from 'react';
import { useSubmitReview } from '../hooks/useSubmitReview';
import { ApiError } from '../api/client';

interface Props {
  productId: string;
  onDone: () => void;
}

export function WriteReviewForm({ productId, onDone }: Props) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const submit = useSubmitReview();

  const photoUrlValid = photoUrl.trim() === '' || URL.canParse(photoUrl.trim());
  const canSubmit = rating > 0 && body.trim().length > 0 && photoUrlValid;

  if (submit.isSuccess) {
    return (
      <div className="flex flex-col items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm text-emerald-800">Thanks for your review!</p>
        <button type="button" className="text-sm underline" onClick={onDone}>
          Done
        </button>
      </div>
    );
  }

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
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4"
    >
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            type="button"
            key={star}
            onClick={() => setRating(star)}
            role="radio"
            aria-checked={star === rating}
            aria-label={`${star} star`}
            className="text-2xl text-amber-400"
          >
            {star <= rating ? '★' : '☆'}
          </button>
        ))}
      </div>
      <input
        placeholder="Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
      />
      <textarea
        placeholder="Your review"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
        rows={4}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
      />
      <input
        placeholder="Photo URL (optional)"
        value={photoUrl}
        onChange={(e) => setPhotoUrl(e.target.value)}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
      />
      {!photoUrlValid && <p className="text-sm text-red-600">Enter a valid URL, or leave it blank.</p>}
      {submit.isError && (
        <p role="alert" className="text-sm text-red-600">
          {submit.error instanceof ApiError
            ? submit.error.message
            : 'Something went wrong — try again.'}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!canSubmit || submit.isPending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submit.isPending ? 'Posting…' : 'Post review'}
        </button>
        <button type="button" onClick={onDone} className="text-sm text-neutral-500 underline">
          Cancel
        </button>
      </div>
    </form>
  );
}
