import axios, { AxiosError } from 'axios';
import { getToken, clearAll } from '../utils/storage';

const BASE_URL = 'http://172.20.10.2:8080/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
    if (error.response?.status === 401) {
      await clearAll();
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
  return [];
}

export default apiClient;
