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

// NewsData's `q` param matches loosely (anywhere in the article, not just
// the headline), so a broad OR query like the default feed's pulls in
// clearly off-topic results (vehicle registration, diplomacy, constitution
// — confirmed live) alongside real agriculture stories. This gate checks
// title + description against a broad agriculture vocabulary before an
// article is kept.
const AGRIC_RELEVANCE_KEYWORDS = [
  'agric', 'farm', 'farmer', 'farming', 'crop', 'harvest', 'food security',
  'cocoa', 'cocobod', 'maize', 'corn', 'cassava', 'rice', 'paddy', 'yam',
  'groundnut', 'sorghum', 'millet', 'plantain', 'banana', 'tomato', 'pepper',
  'onion', 'shea', 'cashew', 'cotton', 'pineapple', 'coconut', 'ginger',
  'rubber', 'oil palm', 'livestock', 'poultry', 'cattle', 'sheep', 'goat',
  'pig', 'dairy', 'irrigation', 'fertiliser', 'fertilizer', 'agrochemical',
  'agro-chemical', 'pesticide', 'herbicide', 'insecticide', 'soil', 'seedling',
  'seed', 'plantation', 'smallholder', 'rural farm', 'mofa', 'gaec', 'gida',
  'fishing', 'aquaculture', 'agroforest', 'animal feed', 'npk', 'urea',
  'manure', 'compost', 'nutrient', 'tractor', 'agri-equipment', 'machinery',
  'agribusiness', 'agro-processing', 'export crop', 'commodity price',
  'produce market', 'cocoa farmer', 'cocoa price',
];

// Second layer of defense: even with the allowlist above, a handful of
// non-agric articles slip through on incidental word overlap (a diplomacy
// piece that happens to say "Ghana's development", a politics story that
// mentions a minister's rural "farm" background, etc — confirmed live).
// If any of these show up, the article is dropped outright regardless of
// what else matched.
const NON_AGRIC_EXCLUDE_KEYWORDS = [
  'election', 'parliament', 'constitution', 'constitutional review',
  'diplomatic', 'bilateral', 'embassy', 'ambassador', 'state visit',
  'afcfta summit', 'jama', 'reunion', 'vice-chancellor', 'anniversary',
  'football', 'boxing', 'basketball', 'afcon', 'premier league',
  'movie', 'music video', 'album', 'celebrity', 'red carpet',
  'cyber threat', 'interpol', 'vehicle registration', 'number plate',
  'dvla', 'gunmen', 'abduct', 'kidnap',
];

function isAgricRelevant(title: string, summary: string, extraKeywords: string[] = []): boolean {
  const text = `${title} ${summary}`.toLowerCase();
  if (NON_AGRIC_EXCLUDE_KEYWORDS.some((kw) => text.includes(kw))) return false;

  const keywords = extraKeywords.length
    ? [...AGRIC_RELEVANCE_KEYWORDS, ...extraKeywords.map((k) => k.toLowerCase()).filter((k) => k.length > 2)]
    : AGRIC_RELEVANCE_KEYWORDS;
  return keywords.some((kw) => text.includes(kw));
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
// timestamp here without verifying against the live API first. Verified
// against the live API (this plan, /1/news endpoint):
//   - `from_date` → 422 UnsupportedParameter ("You can't use the from_date
//     parameter in the /1/news endpoint" — that's an /1/archive-only param
//     on this plan). The 90-day window is enforced client-side instead,
//     see isWithinLast90Days below.
//   - `size` → max 10 per request; anything higher 422s as UnsupportedFilter.
const MAX_PAGE_SIZE = 10;

async function newsDataFetch(
  q: string,
  extra?: { size?: number; page?: string },
): Promise<NewsDataResponse> {
  const params = new URLSearchParams({
    apikey: NEWSDATA_API_KEY,
    country: 'gh',
    language: 'en',
    q: q.slice(0, MAX_QUERY_LENGTH),
  });
  if (extra?.size) params.set('size', String(Math.min(extra.size, MAX_PAGE_SIZE)));
  if (extra?.page) params.set('page', extra.page);

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
// unrelated global results. The default (empty-query) feed uses a broader
// OR'd keyword set instead of a literal phrase — 'Ghana agriculture
// farming' as a phrase only matches ~7 articles total on this API/plan
// (confirmed live), which starves both the initial 50-article target and
// pagination since there's nothing left to page through. The OR form
// matches 100+ articles, giving fetchInitialFeed's pagination loop and the
// Load More button actual pages to walk through.
function buildQuery(userQuery: string): string {
  const trimmed = userQuery.trim();
  if (!trimmed) return 'agriculture OR farming OR cocoa OR maize OR livestock OR fertilizer OR harvest OR farmer';
  return `${trimmed} Ghana agriculture`;
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

function isWithinLast90Days(publishedAt: string): boolean {
  return Date.now() - new Date(publishedAt).getTime() <= NINETY_DAYS_MS;
}

export interface NewsPage {
  items: NewsItem[];
  nextPage: string | null;
}

async function fetchNewsPage(query: string, page?: string, relevanceKeywords?: string[]): Promise<NewsPage> {
  const data = await newsDataFetch(query, { size: MAX_PAGE_SIZE, page });
  const items = data.results
    .filter((a) => a.title && a.link)
    .filter((a) => isAgricRelevant(a.title, a.description ?? '', relevanceKeywords))
    .map(toNewsItem)
    .filter((item) => isWithinLast90Days(item.publishedAt));
  items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return { items, nextPage: data.nextPage ?? null };
}

// Real-time search against NewsData.io, anchored to Ghana agriculture and
// the last 90 days — works for any farming-related keyword, not just a
// fixed keyword list. The user's own search words are always treated as
// relevant (in addition to the base agriculture vocabulary) so a specific
// term like "pesticide" or a crop the base list doesn't happen to name
// still passes the relevance gate. Pass the `nextPage` cursor from a
// previous call to load the next page (Load More).
export async function searchNews(query: string, page?: string): Promise<NewsPage> {
  const userTerms = query.trim().split(/\s+/).filter(Boolean);
  return fetchNewsPage(buildQuery(query), page, userTerms);
}

const TARGET_ARTICLE_COUNT = 50;
// The relevance gate rejects a large share of each raw page (confirmed
// live: ~19/50 raw results actually agriculture-related for the default
// query), so more raw pages are needed to still reach TARGET_ARTICLE_COUNT
// relevant articles than when every result was kept unfiltered.
const MAX_INITIAL_PAGES = 10;

// The API only returns up to MAX_PAGE_SIZE (10) articles per request, so
// the initial feed load pages through a few requests to build up to
// TARGET_ARTICLE_COUNT articles, then hands off the final `nextPage`
// cursor to fetchMoreGhanaAgricultureNews() for the Load More button.
async function fetchInitialFeed(): Promise<NewsPage> {
  const query = buildQuery('');
  const seen = new Set<string>();
  const merged: NewsItem[] = [];
  let page: string | undefined;
  let nextPage: string | null = null;

  for (let i = 0; i < MAX_INITIAL_PAGES && merged.length < TARGET_ARTICLE_COUNT; i++) {
    let batch: NewsPage;
    try {
      batch = await fetchNewsPage(query, page);
    } catch (err) {
      if (i === 0) throw err; // First page failed — nothing to fall back to here.
      break; // Later page failed — return what was already fetched.
    }

    for (const item of batch.items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }

    nextPage = batch.nextPage;
    if (!batch.nextPage) break;
    page = batch.nextPage;
  }

  merged.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return { items: merged.slice(0, TARGET_ARTICLE_COUNT), nextPage };
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
    const fresh = await fetchInitialFeed();
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
