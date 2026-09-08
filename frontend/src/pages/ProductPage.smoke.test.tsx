import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProductPage from './ProductPage';
import { apiFetch, ApiError } from '../api/client';
import type { ProductSummary } from '../hooks/useProduct';
import type { ReviewItem, ReviewsPage } from '../hooks/useReviews';

vi.mock('../api/client', () => ({
  apiFetch: vi.fn(),
  DEMO_PRODUCT_SLUG: 'aurora-wireless-anc-headphones',
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
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

const REVIEW_FIXTURE: ReviewItem = {
  id: 'r1',
  productId: 'p1',
  userId: 'u1',
  userName: 'Marta K.',
  rating: 5,
  title: 'Great sound',
  body: 'Loved these headphones on every commute.',
  helpfulCount: 3,
  isVerified: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  photoUrls: [],
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
    mockApi(product, { items: [REVIEW_FIXTURE], nextCursor: null, hasNextPage: false });
    renderProductPage();

    expect(await screen.findByText('Loved these headphones on every commute.')).toBeInTheDocument();
    expect(screen.getByText('Marta K.')).toBeInTheDocument();
  });

  it('casts a helpful vote and shows the updated count', async () => {
    const product: ProductSummary = {
      ...PRODUCT_FIXTURE,
      reviewCount: 1,
      averageRating: 5,
      ratingCounts: [0, 0, 0, 0, 1],
    };
    mockApi(product, { items: [REVIEW_FIXTURE], nextCursor: null, hasNextPage: false });
    renderProductPage();

    const voteButton = await screen.findByRole('button', { name: 'Helpful (3)' });

    vi.mocked(apiFetch)
      .mockImplementationOnce(
        () => Promise.resolve({ helpfulCount: 4 }) as ReturnType<typeof apiFetch>,
      )
      .mockImplementationOnce(
        () =>
          Promise.resolve({
            items: [{ ...REVIEW_FIXTURE, helpfulCount: 4 }],
            nextCursor: null,
            hasNextPage: false,
          }) as ReturnType<typeof apiFetch>,
      );
    fireEvent.click(voteButton);

    expect(await screen.findByRole('button', { name: 'Helpful (4)' })).toBeInTheDocument();
  });

  it("shows the backend's error message when a helpful vote fails", async () => {
    const product: ProductSummary = {
      ...PRODUCT_FIXTURE,
      reviewCount: 1,
      averageRating: 5,
      ratingCounts: [0, 0, 0, 0, 1],
    };
    mockApi(product, { items: [REVIEW_FIXTURE], nextCursor: null, hasNextPage: false });
    renderProductPage();

    const voteButton = await screen.findByRole('button', { name: 'Helpful (3)' });

    vi.mocked(apiFetch).mockImplementationOnce(() =>
      Promise.reject(new ApiError(403, "Can't vote on your own review")),
    );
    fireEvent.click(voteButton);

    expect(await screen.findByText("Can't vote on your own review")).toBeInTheDocument();
  });

  it('submits a new review and shows the thank-you state', async () => {
    mockApi(PRODUCT_FIXTURE, { items: [], nextCursor: null, hasNextPage: false });
    renderProductPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Write the first review' }));
    fireEvent.click(screen.getByRole('radio', { name: '5 star' }));
    fireEvent.change(screen.getByLabelText('Your review'), {
      target: { value: 'Excellent build quality.' },
    });

    vi.mocked(apiFetch).mockImplementationOnce(
      () =>
        Promise.resolve({
          id: 'r2',
          productId: PRODUCT_FIXTURE.id,
          userId: 'u2',
          userName: 'Daniel P.',
          rating: 5,
          title: null,
          body: 'Excellent build quality.',
          helpfulCount: 0,
          isVerified: false,
          createdAt: '2026-01-01T00:00:00.000Z',
        }) as ReturnType<typeof apiFetch>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Post review' }));

    expect(await screen.findByText('Thanks for your review!')).toBeInTheDocument();
  });
});
