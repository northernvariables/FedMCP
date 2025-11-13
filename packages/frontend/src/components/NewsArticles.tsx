/**
 * News articles component for displaying MP-related news
 */

'use client';

import Image from 'next/image';
import { Newspaper, ExternalLink, Calendar } from 'lucide-react';
import { MapleLeafIcon } from '@canadagpt/design-system';

interface NewsArticle {
  title: string;
  url: string;
  source: string;
  published_date?: string;
  description?: string;
  image_url?: string;
  last_updated: string;
}

interface NewsArticlesProps {
  articles: NewsArticle[];
  loading?: boolean;
}

/**
 * Calculate relative time from now (e.g., "5 minutes ago")
 */
function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

/**
 * Strip HTML tags and decode HTML entities from text
 */
function stripHtml(html: string): string {
  if (!html) return '';

  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, ' ');

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");

  // Clean up multiple spaces
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

export function NewsArticles({ articles, loading }: NewsArticlesProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-red"></div>
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <p className="text-text-secondary">No recent news articles found.</p>
    );
  }

  // Get the first article's last_updated timestamp (all articles from same fetch have same timestamp)
  const lastUpdated = articles[0]?.last_updated;

  return (
    <div className="space-y-4">
      {lastUpdated && (
        <div className="flex items-center gap-2 text-sm text-text-tertiary pb-2 border-b border-border-subtle">
          <Calendar className="h-4 w-4" />
          <span>Last updated: {getRelativeTime(lastUpdated)}</span>
        </div>
      )}
      {articles.map((article, index) => (
        <a
          key={index}
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-lg bg-bg-elevated hover:bg-bg-secondary/60 transition-all duration-200 overflow-hidden border border-border-subtle hover:border-border-emphasis group"
        >
          <div className="flex gap-4">
            {/* Article Image */}
            {article.image_url ? (
              <div className="flex-shrink-0 w-48 h-32 bg-bg-secondary relative overflow-hidden">
                <Image
                  src={article.image_url}
                  alt={article.title}
                  width={192}
                  height={128}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    // Hide image if it fails to load
                    e.currentTarget.parentElement!.style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="flex-shrink-0 w-48 h-32 bg-bg-secondary flex items-center justify-center">
                <MapleLeafIcon className="h-16 w-16 text-accent-red" size={64} />
              </div>
            )}

            {/* Article Content */}
            <div className="flex-1 p-4 min-w-0">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-base font-semibold text-text-primary group-hover:text-blue-400 transition-colors line-clamp-2">
                  {article.title}
                </h3>
                <ExternalLink className="h-4 w-4 text-text-tertiary flex-shrink-0 mt-0.5 group-hover:text-blue-400 transition-colors" />
              </div>

              {(() => {
                const cleanDescription = article.description ? stripHtml(article.description) : '';
                const cleanTitle = article.title.trim();

                // Only show description if it's meaningfully different from the title
                // Check: not empty, not identical, not starting with title, and title not contained in first 80% of description
                const isDifferent = cleanDescription &&
                                   cleanDescription !== cleanTitle &&
                                   !cleanDescription.startsWith(cleanTitle) &&
                                   cleanDescription.length > cleanTitle.length + 10; // Must be meaningfully longer

                if (isDifferent) {
                  return (
                    <p className="text-sm text-text-secondary line-clamp-2 mb-3">
                      {cleanDescription}
                    </p>
                  );
                }
                return null;
              })()}

              <div className="flex items-center gap-4 text-xs text-text-tertiary">
                <div className="flex items-center gap-1.5">
                  <Newspaper className="h-3.5 w-3.5" />
                  <span className="font-medium">{article.source}</span>
                </div>
                {article.published_date && (
                  <>
                    <span className="text-border-emphasis">•</span>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(article.published_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
