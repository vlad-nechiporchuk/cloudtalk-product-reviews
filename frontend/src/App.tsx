import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProductPage from './pages/ProductPage';
import { ApiError } from './api/client';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A 4xx means the request itself is wrong, not transient — retrying
      // can't succeed and only delays the error state.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) &&
        failureCount < 3,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProductPage />
    </QueryClientProvider>
  );
}

export default App;
