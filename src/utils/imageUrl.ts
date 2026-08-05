import { BASE_URL } from '../api/axios';

// BASE_URL is the API root (e.g. "https://host.example.com/api") — strip the
// "/api" suffix to get the origin that relative upload paths (e.g.
// "/uploads/xyz.jpg") need to be resolved against. Derived from the single
// source of truth instead of a second hardcoded copy, so it can never drift
// out of sync with whichever backend the app is actually pointed at.
const API_ORIGIN = BASE_URL.replace(/\/api\/?$/, '');

// Matches local/private dev hosts (e.g. "172.20.10.2:8080", "localhost:3000")
// that can end up baked into old records from before the app was pointed at
// the current backend or a CDN — never a legitimate public host.
const STALE_LOCAL_HOST_PATTERN =
  /^(localhost|127\.\d{1,3}\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?$/i;

// Normalizes any image path the backend returns into a fully-qualified URL.
// The backend sometimes returns an absolute URL already (including
// third-party CDN URLs like Cloudinary, which must be trusted as-is) and
// sometimes a relative path — use this wherever an equipment (or other
// uploaded) image is displayed so all cases render correctly.
export function getImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  const host = url.match(/^https?:\/\/([^/]+)/)?.[1] ?? '';
  if (STALE_LOCAL_HOST_PATTERN.test(host)) {
    // Stale local-dev host baked into an old record — rebase its path onto
    // the current API origin so it self-heals instead of staying broken.
    const path = url.replace(/^https?:\/\/[^/]+/, '');
    return `${API_ORIGIN}${path}`;
  }
  return url;
}
