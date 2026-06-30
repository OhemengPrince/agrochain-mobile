// Replace GUARDIAN_API_KEY with your free key from https://open-platform.theguardian.com/access/
const GUARDIAN_API_KEY = 'test';
const GUARDIAN_BASE_URL = 'https://content.guardianapis.com/search';

export interface GuardianArticle {
  id: string;
  webTitle: string;
  webPublicationDate: string;
  webUrl: string;
  sectionName: string;
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
  const diffMs = now.getTime() - published.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}hr${diffHrs !== 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return published.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  time: string;
  url: string;
  summary?: string;
}

export async function fetchGhanaAgricultureNews(): Promise<NewsItem[]> {
  const query = encodeURIComponent('Ghana agriculture OR farming OR cocoa OR maize OR crops OR food security');
  const params = new URLSearchParams({
    q: 'Ghana agriculture OR Ghana farming OR Ghana cocoa OR Ghana crops',
    'show-fields': 'trailText,thumbnail',
    'page-size': '10',
    'order-by': 'newest',
    'api-key': GUARDIAN_API_KEY,
  });

  const res = await fetch(`${GUARDIAN_BASE_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`Guardian API error: ${res.status}`);

  const data: GuardianResponse = await res.json();

  return data.response.results.map((article) => ({
    id: article.id,
    headline: article.webTitle,
    source: 'The Guardian',
    time: timeAgo(article.webPublicationDate),
    url: article.webUrl,
    summary: article.fields?.trailText,
  }));
}
