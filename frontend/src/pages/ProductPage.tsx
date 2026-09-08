import { useState } from 'react';
import { useProduct } from '../hooks/useProduct';
import { useReviews, type SortMode } from '../hooks/useReviews';
import { RatingSummary } from '../components/RatingSummary';
import { ReviewList } from '../components/ReviewList';
import { SortFilterBar } from '../components/SortFilterBar';
import { EmptyState } from '../components/EmptyState';
import { WriteReviewForm } from '../components/WriteReviewForm';
import { ProductHeader } from '../components/ProductHeader';
import { DEMO_PRODUCT_SLUG } from '../api/client';

export default function ProductPage() {
  const [sort, setSort] = useState<SortMode>('newest');
  const [verified, setVerified] = useState(false);
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);

  const product = useProduct(DEMO_PRODUCT_SLUG);
  const reviews = useReviews(product.data?.id, sort, rating, verified);

  if (product.isLoading) {
    return <p className="p-8 text-sm text-text-secondary">Loading…</p>;
  }
  if (product.isError || !product.data) {
    return (
      <p role="alert" className="p-8 text-sm text-danger">
        Something went wrong loading this product.{' '}
        <button type="button" className="underline" onClick={() => product.refetch()}>
          Retry
        </button>
      </p>
    );
  }

  const { data } = product;
  const items = reviews.data?.pages.flatMap((page) => page.items) ?? [];
  const hasAnyReviews = data.reviewCount > 0;
  const filtersActive = rating !== undefined || verified;
  // product and reviews are independent queries — a settled, empty reviews
  // list while reviewCount > 0 means the two are out of sync, not that
  // there are genuinely no reviews.
  const settledWithNoItems =
    hasAnyReviews && !reviews.isLoading && !reviews.isError && items.length === 0;
  const noResultsForFilters = settledWithNoItems && filtersActive;
  const unexpectedlyEmpty = settledWithNoItems && !filtersActive;

  const clearFilters = (): void => {
    setRating(undefined);
    setVerified(false);
  };

  return (
    <div className="min-h-screen">
      <ProductHeader
        name={data.name}
        category={data.category}
        priceCents={data.priceCents}
        averageRating={data.averageRating}
        reviewCount={data.reviewCount}
        wide={hasAnyReviews}
      />

      {showForm && (
        <WriteReviewForm
          productId={data.id}
          productName={data.name}
          onDone={() => setShowForm(false)}
        />
      )}

      {!hasAnyReviews ? (
        <div className="mx-auto max-w-[760px] px-8 py-10">
          <EmptyState onWriteReview={() => setShowForm(true)} />
        </div>
      ) : (
        <div className="mx-auto grid max-w-[1120px] grid-cols-1 gap-10 px-8 py-10 md:grid-cols-[320px_1fr]">
          <div className="flex flex-col gap-5 rounded-2xl border border-border-subtle bg-surface p-6.5 md:sticky md:top-6 md:self-start">
            <RatingSummary
              averageRating={data.averageRating}
              reviewCount={data.reviewCount}
              ratingCounts={data.ratingCounts}
              rating={rating}
              onRatingChange={setRating}
            />
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-lg bg-accent px-4.5 py-3 text-sm font-semibold text-white"
            >
              Write a review
            </button>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <span className="font-sora text-lg font-bold text-text-primary">Customer reviews</span>

            <SortFilterBar
              sort={sort}
              onSortChange={setSort}
              verified={verified}
              onVerifiedChange={setVerified}
              rating={rating}
              onRatingChange={setRating}
            />

            {reviews.isError && (
              <p role="alert" className="text-sm text-danger">
                Couldn't load reviews.{' '}
                <button type="button" className="underline" onClick={() => reviews.refetch()}>
                  Retry
                </button>
              </p>
            )}

            {reviews.isLoading && (
              <p className="py-8 text-center text-sm text-text-secondary">Loading reviews…</p>
            )}

            {noResultsForFilters && (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border-light py-8 text-center text-sm text-text-secondary">
                <p className="m-0">No reviews match these filters.</p>
                <button type="button" className="underline" onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            )}

            {unexpectedlyEmpty && (
              <p role="alert" className="py-8 text-center text-sm text-danger">
                Reviews couldn't be displayed right now.{' '}
                <button type="button" className="underline" onClick={() => reviews.refetch()}>
                  Retry
                </button>
              </p>
            )}

            {!reviews.isError && items.length > 0 && (
              <ReviewList
                items={items}
                hasNextPage={reviews.hasNextPage}
                isFetchingNextPage={reviews.isFetchingNextPage}
                onLoadMore={() => reviews.fetchNextPage()}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
