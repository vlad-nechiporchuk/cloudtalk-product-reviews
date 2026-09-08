import { useState } from 'react';
import { useProduct } from '../hooks/useProduct';
import { useReviews, type SortMode } from '../hooks/useReviews';
import { RatingSummary } from '../components/RatingSummary';
import { ReviewList } from '../components/ReviewList';
import { SortFilterBar } from '../components/SortFilterBar';
import { EmptyState } from '../components/EmptyState';
import { DEMO_PRODUCT_SLUG } from '../api/client';

export default function ProductPage() {
  const [sort, setSort] = useState<SortMode>('newest');
  const [verified, setVerified] = useState(false);
  const [rating, setRating] = useState<number | undefined>(undefined);

  const product = useProduct(DEMO_PRODUCT_SLUG);
  const reviews = useReviews(product.data?.id, sort, rating, verified);

  if (product.isLoading) {
    return <p className="p-8 text-sm text-neutral-500">Loading…</p>;
  }
  if (product.isError || !product.data) {
    return (
      <p role="alert" className="p-8 text-sm text-red-600">
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
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold text-neutral-900">{data.name}</h1>
      <RatingSummary
        averageRating={data.averageRating}
        reviewCount={data.reviewCount}
        ratingCounts={data.ratingCounts}
        rating={rating}
        onRatingChange={setRating}
      />
      {!hasAnyReviews ? (
        <EmptyState />
      ) : (
        <>
          <SortFilterBar
            sort={sort}
            onSortChange={setSort}
            verified={verified}
            onVerifiedChange={setVerified}
            rating={rating}
            onRatingChange={setRating}
          />

          {reviews.isError && (
            <p role="alert" className="text-sm text-red-600">
              Couldn't load reviews.{' '}
              <button type="button" className="underline" onClick={() => reviews.refetch()}>
                Retry
              </button>
            </p>
          )}

          {reviews.isLoading && (
            <p className="py-8 text-center text-sm text-neutral-500">Loading reviews…</p>
          )}

          {noResultsForFilters && (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-neutral-500">
              <p>No reviews match these filters.</p>
              <button type="button" className="underline" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          )}

          {unexpectedlyEmpty && (
            <p role="alert" className="py-8 text-center text-sm text-red-600">
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
        </>
      )}
    </div>
  );
}
