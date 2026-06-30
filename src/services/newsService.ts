import { GUARDIAN_API_KEY } from '@env';

const BASE = 'https://content.guardianapis.com/search';
const FIELDS = 'trailText,thumbnail';

// Keywords that must appear in the article HEADLINE for it to qualify as agriculture news.
// This is the strictest filter — body mentions are not enough.
const AGRIC_HEADLINE_KEYWORDS = [
  'agric', 'farm', 'farmer', 'crop', 'harvest', 'food',
  'cocoa', 'maize', 'cassava', 'rice', 'yam', 'groundnut',
  'sorghum', 'plantain', 'tomato', 'pepper', 'onion', 'shea',
  'rubber', 'livestock', 'poultry', 'cattle', 'irrigation',
  'fertiliser', 'fertilizer', 'soil', 'plantation', 'seeds',
  'COCOBOD', 'smallholder', 'rural', 'MoFA', 'GAEC',
  'fishing', 'aquaculture', 'agroforest',
];

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

function isAgricHeadline(title: string): boolean {
  const t = title.toLowerCase();
  return AGRIC_HEADLINE_KEYWORDS.some((kw) => t.includes(kw.toLowerCase()));
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
    tag: 'world/ghana',   // hard-lock: only articles editorially tagged as Ghana
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

export async function fetchGhanaAgricultureNews(): Promise<NewsItem[]> {
  const [diverse, cocoaExtra] = await Promise.all([
    // Query 1: broad Ghana agric — no cocoa bias
    guardianFetch(
      'farming OR maize OR cassava OR rice OR yam OR groundnut OR sorghum OR plantain OR ' +
      'tomato OR pepper OR onion OR livestock OR poultry OR shea OR rubber OR irrigation OR ' +
      'agriculture OR "food security" OR fertiliser OR agribusiness OR harvest OR crops OR ' +
      'smallholder OR seeds OR fishing OR aquaculture',
      20,
    ),
    // Query 2: cocoa capped at 4 results
    guardianFetch('cocoa OR COCOBOD', 4),
  ]);

  const seen = new Set<string>();
  const merged: NewsItem[] = [];

  for (const a of [...diverse, ...cocoaExtra]) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    // Strict gate: the HEADLINE must contain an agriculture keyword.
    // This cuts politics/sports/crime articles that merely mention a farm word in passing.
    if (isAgricHeadline(a.webTitle)) {
      merged.push(toNewsItem(a));
    }
  }

  return merged;
}
