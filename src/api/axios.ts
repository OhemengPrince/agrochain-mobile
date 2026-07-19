import axios, { AxiosError } from 'axios';
import { getToken, clearAll } from '../utils/storage';

const BASE_URL = 'http://172.20.10.2:8080/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 25000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// AuthContext registers this after mount so the interceptor can reset
// in-memory auth state without a circular import (axios → AuthContext → axios).
let _onAuthFailure: (() => void) | null = null;
export function registerAuthFailureHandler(cb: () => void): void {
  _onAuthFailure = cb;
}

apiClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const method = error.config?.method?.toUpperCase();
    const url = error.config?.url;
    if (error.code === 'ECONNABORTED') {
      console.log(`[axios] TIMEOUT on ${method} ${url} — request took too long (server unreachable or slow network)`);
    } else if (!error.response) {
      console.log(`[axios] NETWORK ERROR on ${method} ${url} —`, error.message, '(is the backend reachable at', BASE_URL, '?)');
    } else {
      console.log(`[axios] HTTP ${status} on ${method} ${url} —`, JSON.stringify(error.response.data));
    }
    // Treat both 401 (expired/missing token) and 403 (backend secret rotation /
    // invalid signature) as auth failures — clear storage then reset React state.
    if (status === 401 || status === 403) {
      console.log('[axios] clearing session due to auth failure');
      await clearAll();
      _onAuthFailure?.();
    }
    return Promise.reject(error);
  }
);

// Normalizes paginated or wrapped list responses from the backend.
// Handles: plain arrays, Spring Boot Page { content: [...] }, or { data: [...] }.
export function extractArray<T>(raw: any): T[] {
  if (Array.isArray(raw)) return raw;
  if (raw?.content && Array.isArray(raw.content)) return raw.content;
  if (raw?.data && Array.isArray(raw.data)) return raw.data;
  if (raw?.items && Array.isArray(raw.items)) return raw.items;
  if (raw?.notifications && Array.isArray(raw.notifications)) return raw.notifications;
  return [];
}

export default apiClient;
