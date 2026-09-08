const BASE_URL = import.meta.env.VITE_API_BASE_URL;
if (!BASE_URL) {
  throw new Error('VITE_API_BASE_URL is not set — copy frontend/.env.example to frontend/.env');
}

export const DEMO_PRODUCT_SLUG = import.meta.env.VITE_DEMO_PRODUCT_SLUG;
if (!DEMO_PRODUCT_SLUG) {
  throw new Error('VITE_DEMO_PRODUCT_SLUG is not set — copy frontend/.env.example to frontend/.env');
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let currentToken: string | null = localStorage.getItem('demoToken');

export function setCurrentToken(token: string | null): void {
  currentToken = token;
  if (token) {
    localStorage.setItem('demoToken', token);
  } else {
    localStorage.removeItem('demoToken');
  }
}

export function getCurrentToken(): string | null {
  return currentToken;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (currentToken) {
    headers.set('Authorization', `Bearer ${currentToken}`);
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const body: { message?: string } = await res.json().catch((err: unknown) => {
      console.error(`apiFetch: non-JSON error body for ${res.status} ${path}`, err);

      return {};
    });
    throw new ApiError(res.status, body.message ?? `Request failed: ${res.status}`);
  }

  return res.status === 204 ? (undefined as T) : res.json();
}
