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
      if (error.config?.data && typeof error.config.data === 'string') {
        console.log(`[axios] request body was —`, error.config.data);
      }
    }
    // A 401 normally means the session itself is invalid (expired/missing
    // token) — clear storage and reset React state, which sends the user back
    // to the Auth stack. But this backend also reuses 401 for role/permission
    // rejections (e.g. "Only farmers can book equipment"), which is a
    // business-rule error, not an invalid session — force-logging out on
    // those silently kicks the user back to Onboarding instead of showing
    // them the actual error message. Detect that phrasing and skip the
    // forced logout so the error surfaces normally on screen instead.
    const message = (error.response?.data as any)?.message;
    const isRoleRestriction = typeof message === 'string' && /^only\b.*\bcan\b/i.test(message.trim());
    if (status === 401 && !isRoleRestriction) {
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
  if (raw?.followers && Array.isArray(raw.followers)) return raw.followers;
  if (raw?.following && Array.isArray(raw.following)) return raw.following;
  if (raw?.users && Array.isArray(raw.users)) return raw.users;
  return [];
}

export default apiClient;
