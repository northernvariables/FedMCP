/**
 * News fetcher for retrieving articles mentioning MPs from Canadian news sources
 * Uses Google News RSS feeds which are free and don't require an API key
 */

import { XMLParser } from 'fast-xml-parser';

export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  published_date: string | null;
  description: string;
  image_url: string | null;
  last_updated: string;
}

// Canadian news sources for relevance filtering
const CANADIAN_SOURCES = [
  'cbc.ca',
  'globalnews.ca',
  'ctvnews.ca',
  'theglobeandmail.com',
  'nationalpost.com',
  'thestar.com',
  'hilltimes.com',
  'macleans.ca',
  'winnipegfreepress.com',
  'calgaryherald.com',
  'montrealgazette.com',
  'ottawacitizen.com',
];

const SOURCE_NAMES: Record<string, string> = {
  'cbc.ca': 'CBC News',
  'globalnews.ca': 'Global News',
  'ctvnews.ca': 'CTV News',
  'theglobeandmail.com': 'The Globe and Mail',
  'nationalpost.com': 'National Post',
  'thestar.com': 'Toronto Star',
  'hilltimes.com': 'The Hill Times',
  'macleans.ca': "Maclean's",
  'winnipegfreepress.com': 'Winnipeg Free Press',
  'calgaryherald.com': 'Calgary Herald',
  'montrealgazette.com': 'Montreal Gazette',
  'ottawacitizen.com': 'Ottawa Citizen',
};

/**
 * Fetch news articles mentioning an MP
 */
export async function fetchMPNews(
  mpName: string,
  limit: number = 10
): Promise<NewsArticle[]> {
  try {
    // Capture timestamp when fetch occurs
    const lastUpdated = new Date().toISOString();

    // Build search query - add "Canada" and "MP" for relevance
    const searchQuery = `"${mpName}" MP Canada`;

    // Google News RSS feed URL
    const params = new URLSearchParams({
      q: searchQuery,
      hl: 'en-CA', // Canadian English
      gl: 'CA', // Canada region
      ceid: 'CA:en',
    });

    const url = `https://news.google.com/rss/search?${params.toString()}`;

    // Fetch RSS feed
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; FedMCP/1.0; +https://github.com/yourusername/fedmcp)',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch news for ${mpName}: ${response.statusText}`);
      return [];
    }

    const xmlText = await response.text();

    // Parse RSS XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });

    const parsed = parser.parse(xmlText);

    // Extract items from RSS feed
    const items = parsed?.rss?.channel?.item || [];
    const itemsArray = Array.isArray(items) ? items : [items];

    const articles: NewsArticle[] = itemsArray
      .slice(0, limit)
      .map((item: any) => {
        const title = item.title || 'No title';
        const url = item.link || '';
        const description = item.description || '';
        const pubDate = item.pubDate || null;

        // Extract source - handle both string and object formats
        let source: string;
        if (typeof item.source === 'string') {
          source = item.source;
        } else if (item.source && typeof item.source === 'object') {
          // RSS source element can have text content and url attribute
          source = item.source['#text'] || extractSourceFromUrl(item.source['@_url'] || url);
        } else {
          source = extractSourceFromUrl(url);
        }

        // Parse and format date
        let publishedDate: string | null = null;
        if (pubDate) {
          try {
            const date = new Date(pubDate);
            publishedDate = date.toISOString();
          } catch (e) {
            publishedDate = pubDate;
          }
        }

        // Extract image URL from various possible locations in RSS feed
        let imageUrl: string | null = null;

        // Try enclosure tag (common in RSS feeds)
        if (item.enclosure && item.enclosure['@_url']) {
          imageUrl = item.enclosure['@_url'];
        }
        // Try media:content tag
        else if (item['media:content'] && item['media:content']['@_url']) {
          imageUrl = item['media:content']['@_url'];
        }
        // Try media:thumbnail tag
        else if (item['media:thumbnail'] && item['media:thumbnail']['@_url']) {
          imageUrl = item['media:thumbnail']['@_url'];
        }
        // Try to extract from description HTML if present
        else if (description) {
          const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
          if (imgMatch && imgMatch[1]) {
            imageUrl = imgMatch[1];
          }
        }

        return {
          title,
          url,
          source,
          published_date: publishedDate,
          description,
          image_url: imageUrl,
          last_updated: lastUpdated,
        };
      });

    // Filter to Canadian sources if we have enough results
    const filtered = articles.filter((article) =>
      CANADIAN_SOURCES.some((source) => article.url.toLowerCase().includes(source))
    );

    // Use filtered results if we have at least half of what we wanted
    if (filtered.length >= Math.min(5, limit / 2)) {
      return filtered.slice(0, limit);
    }

    return articles;
  } catch (error) {
    console.error(`Error fetching news for ${mpName}:`, error);
    return [];
  }
}

/**
 * Extract and format news source name from URL
 */
function extractSourceFromUrl(url: string): string {
  if (!url) return 'Unknown';

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase().replace('www.', '');

    // Return mapped name or capitalize domain
    return (
      SOURCE_NAMES[domain] || domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1)
    );
  } catch {
    return 'Unknown';
  }
}
