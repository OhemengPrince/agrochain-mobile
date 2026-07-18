import { GUARDIAN_API_KEY } from '@env';

const BASE = 'https://content.guardianapis.com/search';
const FIELDS = 'trailText,thumbnail';

export type NewsTopicChip = 'All' | 'Farming' | 'Harvest' | 'Fertilizers' | 'Livestock' | 'Markets';

// Keywords that must appear in the HEADLINE for an article to pass the agric gate
const AGRIC_HEADLINE_KEYWORDS = [
  'agric', 'farm', 'farmer', 'crop', 'harvest', 'food',
  'cocoa', 'maize', 'cassava', 'rice', 'yam', 'groundnut',
  'sorghum', 'plantain', 'tomato', 'pepper', 'onion', 'shea',
  'rubber', 'livestock', 'poultry', 'cattle', 'irrigation',
  'fertiliser', 'fertilizer', 'soil', 'plantation', 'seeds',
  'COCOBOD', 'smallholder', 'rural', 'MoFA', 'GAEC',
  'fishing', 'aquaculture', 'agroforest', 'feed', 'pest',
  'NPK', 'urea', 'manure', 'compost', 'nutrient',
];

// Topic classification — checked in priority order (most-specific first)
const TOPIC_RULES: { topic: NewsTopicChip; keywords: string[] }[] = [
  {
    topic: 'Harvest',
    keywords: ['harvest', 'yield', 'bumper', 'post-harvest', 'storage', 'drying', 'milling', 'season'],
  },
  {
    topic: 'Fertilizers',
    keywords: [
      'fertiliser', 'fertilizer', 'npk', 'urea', 'manure', 'compost',
      'nutrient', 'soil health', 'soil fertility', 'agro-chemical', 'pesticide',
      'herbicide', 'weedicide', 'insecticide', 'planting material',
    ],
  },
  {
    topic: 'Livestock',
    keywords: [
      'livestock', 'poultry', 'cattle', 'sheep', 'goat', 'pig', 'chicken',
      'dairy', 'fishing', 'aquaculture', 'animal husbandry', 'veterinary',
    ],
  },
  {
    topic: 'Markets',
    keywords: [
      'market', 'price', 'export', 'import', 'trade', 'agribusiness',
      'commodity', 'supply', 'demand', 'cocobod', 'buyer', 'revenue',
    ],
  },
  {
    topic: 'Farming',
    keywords: [
      'farm', 'agric', 'crop', 'plantation', 'smallholder', 'cocoa',
      'maize', 'cassava', 'rice', 'yam', 'groundnut', 'tomato', 'food',
      'irrigation', 'seeds', 'rural', 'rural', 'shea',
    ],
  },
];

function classifyTopic(headline: string, summary = ''): NewsTopicChip {
  const text = `${headline} ${summary}`.toLowerCase();
  for (const { topic, keywords } of TOPIC_RULES) {
    if (keywords.some((kw) => text.includes(kw))) return topic;
  }
  return 'Farming';
}

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

function toNewsItem(a: GuardianArticle): NewsItem {
  const summary = a.fields?.trailText;
  return {
    id: a.id,
    headline: a.webTitle,
    source: 'The Guardian',
    time: timeAgo(a.webPublicationDate),
    publishedAt: a.webPublicationDate,
    url: a.webUrl,
    summary,
    imageUrl: a.fields?.thumbnail,
    topic: classifyTopic(a.webTitle, summary),
  };
}

async function guardianFetch(q: string, pageSize: number): Promise<GuardianArticle[]> {
  const params = new URLSearchParams({
    tag: 'world/ghana',
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

// Real-time search against the Guardian API, scoped to agriculture + Ghana
export async function searchGuardianNews(query: string): Promise<NewsItem[]> {
  const params = new URLSearchParams({
    q: `${query} agriculture ghana`,
    'show-fields': 'thumbnail,trailText,byline',
    'page-size': '20',
    'order-by': 'relevance',
    'api-key': GUARDIAN_API_KEY,
  });
  const res = await fetch(`${BASE}?${params}`);
  if (!res.ok) throw new Error(`Guardian ${res.status}`);
  const data: GuardianResponse = await res.json();
  return data.response.results.map(toNewsItem);
}

// Four parallel queries to maximise variety and volume
export async function fetchGhanaAgricultureNews(): Promise<NewsItem[]> {
  const [crops, fertilizers, livestock, markets] = await Promise.all([
    guardianFetch(
      'farming OR maize OR cassava OR rice OR yam OR groundnut OR sorghum OR ' +
      'plantain OR tomato OR pepper OR onion OR shea OR rubber OR agriculture OR ' +
      'food OR smallholder OR seeds OR plantation OR crop',
      50,
    ),
    guardianFetch(
      'fertiliser OR fertilizer OR NPK OR urea OR manure OR compost OR ' +
      'soil OR irrigation OR pesticide OR herbicide OR agro-chemical OR ' +
      '"soil health" OR "soil fertility" OR "planting materials"',
      50,
    ),
    guardianFetch(
      'livestock OR poultry OR cattle OR sheep OR goat OR chicken OR ' +
      'dairy OR fishing OR aquaculture OR "animal husbandry" OR veterinary',
      50,
    ),
    guardianFetch(
      'cocoa OR COCOBOD OR "food security" OR harvest OR agribusiness OR ' +
      '"market price" OR "farm gate" OR export OR commodity',
      50,
    ),
  ]);

  const seen = new Set<string>();
  const merged: NewsItem[] = [];

  for (const a of [...crops, ...fertilizers, ...livestock, ...markets]) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    if (isAgricHeadline(a.webTitle)) {
      merged.push(toNewsItem(a));
    }
  }

  // Sort merged results newest-first
  merged.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return merged;
}
