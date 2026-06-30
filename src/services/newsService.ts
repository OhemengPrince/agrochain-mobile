import { GUARDIAN_API_KEY } from '@env';

const BASE = 'https://content.guardianapis.com/search';
const FIELDS = 'trailText,thumbnail';

interface GuardianArticle {
  id: string;
  webTitle: string;
  webPublicationDate: string;
  webUrl: string;
  fields?: { trailText?: string; thumbnail?: string };
}

interface GuardianResponse {
  response: { status: string; results: GuardianArticle[] };
}

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  time: string;
  url: string;
  summary?: string;
  imageUrl?: string;
}

function timeAgo(dateStr: string): string {
  const diffMins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const h = Math.floor(diffMins / 60);
  if (h < 24) return `${h}hr${h !== 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d !== 1 ? 's' : ''} ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function toNewsItem(a: GuardianArticle): NewsItem {
  return {
    id: a.id,
    headline: a.webTitle,
    source: 'The Guardian',
    time: timeAgo(a.webPublicationDate),
    url: a.webUrl,
    summary: a.fields?.trailText,
    imageUrl: a.fields?.thumbnail,
  };
}

async function guardianFetch(q: string, pageSize: number): Promise<GuardianArticle[]> {
  const params = new URLSearchParams({
    tag: 'world/ghana',      // hard-lock to Ghana-tagged articles only
    q,
    'show-fields': FIELDS,
    'page-size': String(pageSize),
    'order-by': 'newest',
    'api-key': GUARDIAN_API_KEY,
  });
  const res = await fetch(`${BASE}?${params}`);
  if (!res.ok) throw new Error(`Guardian ${res.status}`);
  const data: GuardianResponse = await res.json();
  return data.response.results;
}

// Two parallel queries so no single crop dominates the feed
export async function fetchGhanaAgricultureNews(): Promise<NewsItem[]> {
  const [diverse, cocoaExtra] = await Promise.all([
    // Query 1: broad Ghana agric — deliberately excludes cocoa so other crops surface
    guardianFetch(
      'farming OR maize OR cassava OR rice OR yam OR groundnut OR sorghum OR plantain OR ' +
      'tomato OR pepper OR onion OR livestock OR poultry OR shea OR rubber OR irrigation OR ' +
      'agriculture OR "food security" OR fertiliser OR agribusiness OR harvest OR crops',
      16,
    ),
    // Query 2: a small allowance for cocoa so it doesn't vanish entirely
    guardianFetch('cocoa OR COCOBOD', 4),
  ]);

  // Merge: diverse results first, then up to 4 cocoa articles, deduplicate
  const seen = new Set<string>();
  const merged: NewsItem[] = [];
  for (const a of [...diverse, ...cocoaExtra]) {
    if (!seen.has(a.id)) {
      seen.add(a.id);
      merged.push(toNewsItem(a));
    }
  }
  return merged;
}
