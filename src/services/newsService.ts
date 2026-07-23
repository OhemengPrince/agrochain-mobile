import { NEWSDATA_API_KEY } from '@env';

const BASE = 'https://newsdata.io/api/1/news';
const COUNTRIES = 'gh,ng,ci,tg,bf';

export type NewsTopicChip =
  | 'All' | 'Cocoa' | 'Maize' | 'Rice' | 'Livestock' | 'Fertilizer' | 'Equipment' | 'Market Prices';

// Keywords that must appear in the HEADLINE for an article to pass the agric gate
const AGRIC_HEADLINE_KEYWORDS = [
  'agric', 'farm', 'farmer', 'crop', 'harvest', 'food',
  'cocoa', 'maize', 'cassava', 'rice', 'yam', 'groundnut',
  'sorghum', 'plantain', 'tomato', 'pepper', 'onion', 'shea',
  'rubber', 'livestock', 'poultry', 'cattle', 'irrigation',
  'fertiliser', 'fertilizer', 'soil', 'plantation', 'seeds',
  'COCOBOD', 'smallholder', 'rural', 'MoFA', 'GAEC',
  'fishing', 'aquaculture', 'agroforest', 'feed', 'pest',
  'NPK', 'urea', 'manure', 'compost', 'nutrient', 'tractor',
  'equipment', 'machinery',
];

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

function timeAgo(dateStr: string): string {
  const diffMins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const h = Math.floor(diffMins / 60);
  if (h < 24) return `${h}hr${h !== 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d !== 1 ? 's' : ''} ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function isAgricHeadline(title: string): boolean {
  const t = title.toLowerCase();
  return AGRIC_HEADLINE_KEYWORDS.some((kw) => t.includes(kw.toLowerCase()));
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
    time: timeAgo(publishedAt),
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

async function newsDataFetch(q: string, extra?: { size?: number; page?: string }): Promise<NewsDataResponse> {
  const params = new URLSearchParams({
    apikey: NEWSDATA_API_KEY,
    language: 'en',
    country: COUNTRIES,
    q: q.slice(0, MAX_QUERY_LENGTH),
  });
  if (extra?.size) params.set('size', String(extra.size));
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

// Real-time search against NewsData.io, scoped to agriculture + Ghana region
export async function searchNews(query: string): Promise<NewsItem[]> {
  const data = await newsDataFetch(`${query} agriculture`, { size: 10 });
  return data.results.filter((a) => a.title && a.link).map(toNewsItem);
}

// Broad query covering all agric topics, kept under NewsData.io's 100-char
// `q` limit — cheaper on the free-tier rate limit than one request per
// category, since topic chips filter client-side over this one result set
// instead of re-fetching per tap. Pulls two pages (~20 articles) so pull-
// to-refresh has fresh volume each time rather than the same 10 headlines.
export async function fetchGhanaAgricultureNews(): Promise<NewsItem[]> {
  const query = 'agriculture OR farming OR cocoa OR maize OR livestock OR fertilizer OR harvest';

  const page1 = await newsDataFetch(query, { size: 10 });
  const page2 = page1.nextPage
    ? await newsDataFetch(query, { size: 10, page: page1.nextPage }).catch(() => null)
    : null;

  const seen = new Set<string>();
  const merged: NewsItem[] = [];

  for (const a of [...page1.results, ...(page2?.results ?? [])]) {
    if (!a.title || !a.link) continue;
    const key = a.article_id ?? a.link;
    if (seen.has(key)) continue;
    seen.add(key);
    if (isAgricHeadline(a.title)) {
      merged.push(toNewsItem(a));
    }
  }

  merged.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return merged;
}
