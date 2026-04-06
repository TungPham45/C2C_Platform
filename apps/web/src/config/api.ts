const rawApiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000/api';

export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, '');
export const AUTH_API_URL = `${API_BASE_URL}/auth`;
export const PRODUCT_API_URL = `${API_BASE_URL}/products`;
