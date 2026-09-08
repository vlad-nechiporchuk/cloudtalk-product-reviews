import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProductPage from './ProductPage';
import { apiFetch } from '../api/client';
import type { ProductSummary } from '../hooks/useProduct';
import type { ReviewItem, ReviewsPage } from '../hooks/useReviews';

vi.mock('../api/client', () => ({
  apiFetch: vi.fn(),
  DEMO_PRODUCT_SLUG: 'aurora-wireless-anc-headphones',
}));

const PRODUCT_FIXTURE: ProductSummary = {
  id: 'p1',
  name: 'Aurora Wireless ANC Headphones',
  slug: 'aurora-wireless-anc-headphones',
  priceCents: 17900,
  category: 'Electronics',
  reviewCount: 0,
  averageRating: null,
  ratingCounts: [0, 0, 0, 0, 0],
};

function mockApi(product: ProductSummary, reviewsPage: ReviewsPage): void {
  vi.mocked(apiFetch).mockImplementation((path) => {
    return Promise.resolve(path.includes('/reviews') ? reviewsPage : product) as ReturnType<
      typeof apiFetch
    >;
  });
}

function renderProductPage(): void {
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <ProductPage />
    </QueryClientProvider>,
  );
}

describe('ProductPage', () => {
  it('renders the product and an empty state when there are no reviews', async () => {
    mockApi(PRODUCT_FIXTURE, { items: [], nextCursor: null, hasNextPage: false });
    renderProductPage();

    expect(await screen.findByText('Aurora Wireless ANC Headphones')).toBeInTheDocument();
    expect(await screen.findByText('No reviews yet')).toBeInTheDocument();
  });

  it('renders the review list when reviews exist', async () => {
    const product: ProductSummary = {
      ...PRODUCT_FIXTURE,
      reviewCount: 1,
      averageRating: 5,
      ratingCounts: [0, 0, 0, 0, 1],
    };
    const review: ReviewItem = {
      id: 'r1',
      productId: 'p1',
      userId: 'u1',
      rating: 5,
      title: 'Great sound',
      body: 'Loved these headphones on every commute.',
      helpfulCount: 3,
      isVerified: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      photoUrls: [],
    };
    mockApi(product, { items: [review], nextCursor: null, hasNextPage: false });
    renderProductPage();

    expect(await screen.findByText('Loved these headphones on every commute.')).toBeInTheDocument();
  });
});
