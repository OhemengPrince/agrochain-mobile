import { NEWSDATA_API_KEY } from '@env';

const BASE = 'https://newsdata.io/api/1/news';

export type NewsTopicChip =
  | 'All' | 'Cocoa' | 'Maize' | 'Rice' | 'Livestock' | 'Fertilizer' | 'Equipment' | 'Market Prices';

// Topic classification — checked in priority order (most-specific first)
const TOPIC_RULES: { topic: NewsTopicChip; keywords: string[] }[] = [
  { topic: 'Cocoa', keywords: ['cocoa', 'cocobod', 'chocolate'] },
  { topic: 'Maize', keywords: ['maize', 'corn'] },
  { topic: 'Rice', keywords: ['rice', 'paddy'] },
  {
    topic: 'Livestock',
    keywords: [
      'livestock', 'poultry', 'cattle', 'sheep', 'goat', 'pig', 'chicken',
      'dairy', 'fishing', 'aquaculture', 'animal husbandry', 'veterinary',
    ],
  },
  {
    topic: 'Fertilizer',
    keywords: [
      'fertiliser', 'fertilizer', 'npk', 'urea', 'manure', 'compost',
      'nutrient', 'soil health', 'soil fertility', 'agro-chemical', 'pesticide',
      'herbicide', 'weedicide', 'insecticide',
    ],
  },
  {
    topic: 'Equipment',
    keywords: [
      'tractor', 'harvester', 'equipment', 'machinery', 'irrigation pump',
      'sprayer', 'tiller', 'plough', 'plow', 'mechanization', 'mechanisation',
    ],
  },
];

function classifyTopic(headline: string, summary = ''): NewsTopicChip {
  const text = `${headline} ${summary}`.toLowerCase();
  for (const { topic, keywords } of TOPIC_RULES) {
    if (keywords.some((kw) => text.includes(kw))) return topic;
  }
  // Nothing matched a specific crop/input/equipment keyword — bucket it
  // under the broadest catch-all topic rather than dropping it.
  return 'Market Prices';
}

interface NewsDataArticle {
  article_id: string;
  title: string;
  link: string;
  description?: string | null;
  pubDate: string;
  image_url?: string | null;
  source_id?: string;
  source_name?: string;
  category?: string[];
}

interface NewsDataResponse {
  status: string;
  totalResults?: number;
  results: NewsDataArticle[];
  nextPage?: string;
  results_message?: string;
}

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  time: string;
  publishedAt: string;
  url: string;
  summary?: string;
  imageUrl?: string;
  topic: NewsTopicChip;
}

function getTimeAgo(publishedAt: string): string {
  const now = new Date();
  const published = new Date(publishedAt);
  const diffMs = now.getTime() - published.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;
  return published.toLocaleDateString();
}

// NewsData.io returns "YYYY-MM-DD HH:mm:ss" (UTC, no timezone marker) —
// normalise to ISO-8601 so Date parsing doesn't fall back to local time.
function toIsoUtc(pubDate: string): string {
  return pubDate.includes('T') ? pubDate : `${pubDate.replace(' ', 'T')}Z`;
}

function toNewsItem(a: NewsDataArticle): NewsItem {
  const summary = a.description ?? undefined;
  const publishedAt = toIsoUtc(a.pubDate);
  return {
    id: a.article_id ?? a.link,
    headline: a.title,
    source: a.source_name ?? a.source_id ?? 'NewsData.io',
    time: getTimeAgo(publishedAt),
    publishedAt,
    url: a.link,
    summary,
    imageUrl: a.image_url ?? undefined,
    topic: classifyTopic(a.title, summary),
  };
}

// NewsData.io's free plan rejects any `q` longer than 100 characters
// (422 UnsupportedQueryLength) — the request fails outright, not partially.
const MAX_QUERY_LENGTH = 100;

// NewsData.io rejects ANY unrecognized query param outright (422
// UnsupportedParameter) — do not add ad-hoc params like a cache-busting
// timestamp here without verifying against the live API first.
async function newsDataFetch(
  q: string,
  extra?: { size?: number; page?: string; fromDate?: string },
): Promise<NewsDataResponse> {
  const params = new URLSearchParams({
    apikey: NEWSDATA_API_KEY,
    country: 'gh',
    language: 'en',
    q: q.slice(0, MAX_QUERY_LENGTH),
  });
  if (extra?.size) params.set('size', String(extra.size));
  if (extra?.page) params.set('page', extra.page);
  if (extra?.fromDate) params.set('from_date', extra.fromDate);

  const res = await fetch(`${BASE}?${params}`);
  const data: NewsDataResponse = await res.json();
  if (!res.ok || data.status !== 'success') {
    const message = data.results_message ?? (data.results as unknown as { message?: string })?.message ?? `NewsData.io ${res.status}`;
    console.error('[newsService] NewsData.io request failed:', message);
    throw new Error(message);
  }
  return data;
}

// Always anchors the query to Ghana agriculture so a bare keyword like
// "pesticide" or "fertilizer" returns Ghana farming news instead of
// unrelated global results — and an empty query still returns the full
// Ghana agriculture feed instead of nothing.
function buildQuery(userQuery: string): string {
  const trimmed = userQuery.trim();
  if (!trimmed) return 'Ghana agriculture farming';
  return `${trimmed} Ghana agriculture`;
}

function ninetyDaysAgoIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString().split('T')[0];
}

export interface NewsPage {
  items: NewsItem[];
  nextPage: string | null;
}

async function fetchNewsPage(query: string, page?: string): Promise<NewsPage> {
  const data = await newsDataFetch(query, { size: 50, page, fromDate: ninetyDaysAgoIso() });
  const items = data.results.filter((a) => a.title && a.link).map(toNewsItem);
  items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return { items, nextPage: data.nextPage ?? null };
}

// Real-time search against NewsData.io, anchored to Ghana agriculture and
// the last 90 days — works for any farming-related keyword, not just a
// fixed keyword list. Pass the `nextPage` cursor from a previous call to
// load the next page (Load More).
export async function searchNews(query: string, page?: string): Promise<NewsPage> {
  return fetchNewsPage(buildQuery(query), page);
}

// NewsData.io's free plan allows 200 requests/day and 10/minute, and this
// feed is loaded independently by the News tab AND each of the 4 home
// dashboards' MarketNewsFeed — without a shared cache, one app open could
// burn through several requests just on first paint. Cache is module-level
// (not per-component) so all callers share one budget, and also remembers
// the NewsData `nextPage` cursor so the News tab's Load More button can
// fetch beyond the cached first page.
interface NewsCache { data: NewsItem[]; nextPage: string | null; timestamp: number }
let newsCache: NewsCache | null = null;
const CACHE_DURATION_MS = 30 * 60 * 1000; // Serve cache untouched for 30 min.
const MIN_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // Even an explicit refresh can't force a network hit sooner than this.

export async function fetchGhanaAgricultureNews(opts?: { forceRefresh?: boolean }): Promise<NewsItem[]> {
  const now = Date.now();
  const cacheAge = newsCache ? now - newsCache.timestamp : Infinity;

  if (newsCache && cacheAge < CACHE_DURATION_MS && !opts?.forceRefresh) {
    return newsCache.data;
  }
  // Pull-to-refresh still honors a cooldown — repeated rapid refreshes serve
  // the same cache instead of spending more of the rate limit.
  if (newsCache && cacheAge < MIN_REFRESH_INTERVAL_MS) {
    return newsCache.data;
  }

  try {
    const fresh = await fetchNewsPage(buildQuery(''));
    newsCache = { data: fresh.items, nextPage: fresh.nextPage, timestamp: now };
    return fresh.items;
  } catch (err) {
    if (newsCache) return newsCache.data; // Serve stale data rather than erroring the UI.
    throw err;
  }
}

// Whether the default (non-search) feed has more pages available to load.
export function hasMoreGhanaAgricultureNews(): boolean {
  return !!newsCache?.nextPage;
}

// Fetches and appends the next page of the default feed using the cursor
// remembered from the last fetchGhanaAgricultureNews() call — powers the
// News tab's Load More button. Returns the full, merged, re-sorted list.
export async function fetchMoreGhanaAgricultureNews(): Promise<NewsItem[]> {
  if (!newsCache?.nextPage) return newsCache?.data ?? [];

  const page = await fetchNewsPage(buildQuery(''), newsCache.nextPage);
  const seen = new Set(newsCache.data.map((item) => item.id));
  const merged = [...newsCache.data, ...page.items.filter((item) => !seen.has(item.id))];
  merged.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  newsCache = { data: merged, nextPage: page.nextPage, timestamp: newsCache.timestamp };
  return merged;
}
