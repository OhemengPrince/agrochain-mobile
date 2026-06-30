import { GUARDIAN_API_KEY } from '@env';

const GUARDIAN_BASE_URL = 'https://content.guardianapis.com/search';

const AGRIC_KEYWORDS = [
  'agriculture', 'farming', 'farmer', 'cocoa', 'maize', 'cassava',
  'crops', 'harvest', 'food security', 'fertiliser', 'fertilizer',
  'agribusiness', 'irrigation', 'livestock', 'poultry', 'soil',
  'plantation', 'rice', 'groundnut', 'tomato', 'yam', 'sorghum',
  'MoFA', 'COCOBOD', 'GAEC', 'agric',
];

interface GuardianArticle {
  id: string;
  webTitle: string;
  webPublicationDate: string;
  webUrl: string;
  fields?: {
    trailText?: string;
    thumbnail?: string;
  };
}

interface GuardianResponse {
  response: {
    status: string;
    results: GuardianArticle[];
  };
}

function timeAgo(dateStr: string): string {
  const published = new Date(dateStr);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - published.getTime()) / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}hr${diffHrs !== 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return published.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function isAgricultureArticle(title: string, summary: string): boolean {
  const text = `${title} ${summary}`.toLowerCase();
  return AGRIC_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()));
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

export async function fetchGhanaAgricultureNews(): Promise<NewsItem[]> {
  // tag=world/ghana restricts to articles editorially tagged as Ghana by The Guardian.
  // q filters those Ghana articles down to agriculture topics only.
  const agricTerms =
    'agriculture OR farming OR cocoa OR maize OR cassava OR crops OR harvest OR ' +
    '"food security" OR fertiliser OR fertilizer OR agribusiness OR livestock OR ' +
    'irrigation OR COCOBOD OR plantation OR groundnut OR yam OR sorghum OR poultry';

  const params = new URLSearchParams({
    tag: 'world/ghana',
    q: agricTerms,
    'show-fields': 'trailText,thumbnail',
    'page-size': '20',
    'order-by': 'newest',
    'api-key': GUARDIAN_API_KEY,
  });

  const res = await fetch(`${GUARDIAN_BASE_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`Guardian API error: ${res.status}`);

  const data: GuardianResponse = await res.json();

  // Client-side pass: keep only articles where the headline or summary
  // contains at least one agriculture keyword (catches edge cases the tag misses).
  return data.response.results
    .filter((a) => isAgricultureArticle(a.webTitle, a.fields?.trailText ?? ''))
    .slice(0, 10)
    .map((article) => ({
      id: article.id,
      headline: article.webTitle,
      source: 'The Guardian',
      time: timeAgo(article.webPublicationDate),
      url: article.webUrl,
      summary: article.fields?.trailText,
      imageUrl: article.fields?.thumbnail,
    }));
}
