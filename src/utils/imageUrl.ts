import { BASE_URL } from '../api/axios';

// BASE_URL is the API root (e.g. "https://host.example.com/api") — strip the
// "/api" suffix to get the origin that relative upload paths (e.g.
// "/uploads/xyz.jpg") need to be resolved against. Derived from the single
// source of truth instead of a second hardcoded copy, so it can never drift
// out of sync with whichever backend the app is actually pointed at.
const API_ORIGIN = BASE_URL.replace(/\/api\/?$/, '');

// Normalizes any image path the backend returns into a fully-qualified URL.
// The backend sometimes returns an absolute URL already and sometimes a
// relative path — use this wherever an equipment (or other uploaded) image
// is displayed so both cases render correctly.
//
// Records created before the app was pointed at the current backend can have
// an absolute URL baked in against an old/dead host (e.g. a local dev IP).
// Those are rebased onto the current API origin too — only the path is
// trusted — so old listings self-heal instead of showing a broken image
// forever.
export function getImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  if (url.startsWith(API_ORIGIN)) return url;
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  return `${API_ORIGIN}${path}`;
}
