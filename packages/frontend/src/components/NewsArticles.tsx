/**
 * News articles component for displaying MP-related news
 */

'use client';

import { Newspaper, ExternalLink, Calendar } from 'lucide-react';
import { MapleLeafIcon } from '@canadagpt/design-system';

interface NewsArticle {
  title: string;
  url: string;
  source: string;
  published_date?: string;
  description?: string;
  image_url?: string;
}

interface NewsArticlesProps {
  articles: NewsArticle[];
  loading?: boolean;
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

  return (
    <div className="space-y-4">
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
                <img
                  src={article.image_url}
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    // Hide image if it fails to load
                    e.currentTarget.parentElement!.style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="flex-shrink-0 w-48 h-32 bg-bg-secondary flex items-center justify-center">
                <MapleLeafIcon className="h-16 w-16 text-accent-red" />
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
