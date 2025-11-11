/**
 * BookmarkButton Component
 *
 * Reusable bookmark button for all card types
 * Features:
 * - Toggle bookmark with optimistic updates
 * - Visual feedback (filled/unfilled bookmark)
 * - Tier limit awareness
 * - Upgrade prompts
 * - Tooltip with state
 */

'use client';

import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { useBookmarksContext } from '@/contexts/BookmarksContext';
import type { CreateBookmarkData } from '@/hooks/useBookmarks';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@canadagpt/design-system';

export interface BookmarkButtonProps {
  /** Data needed to create the bookmark */
  bookmarkData: CreateBookmarkData;
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Show label text */
  showLabel?: boolean;
  /** Callback after successful bookmark action */
  onBookmarkChange?: (isBookmarked: boolean) => void;
}

export function BookmarkButton({
  bookmarkData,
  size = 'sm',
  className,
  showLabel = false,
  onBookmarkChange,
}: BookmarkButtonProps) {
  const { user, profile } = useAuth();
  const { isBookmarked, getBookmark, toggleBookmark, usage } = useBookmarksContext();
  const [isAnimating, setIsAnimating] = useState(false);

  const bookmarked = isBookmarked(bookmarkData.itemType, bookmarkData.itemId);
  const bookmark = getBookmark(bookmarkData.itemType, bookmarkData.itemId);
  const isFavorite = bookmark?.is_favorite || false;

  // Size mappings
  const iconSizes = {
    sm: 18,
    md: 20,
    lg: 24,
  };

  const paddingSizes = {
    sm: 'p-2',
    md: 'p-2.5',
    lg: 'p-3',
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      // Redirect to sign in
      window.location.href = '/api/auth/signin';
      return;
    }

    // Check tier limits before creating
    if (!bookmarked && usage && usage.isAtLimit) {
      // Show upgrade modal/toast
      alert(`You've reached your bookmark limit (${usage.limit}). Upgrade to increase your limit!`);
      return;
    }

    // Animate
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 600);

    // Toggle bookmark
    const result = await toggleBookmark(bookmarkData);

    if (result.success) {
      onBookmarkChange?.(result.action === 'created');
    } else if (result.error) {
      // Show error toast
      console.error('Bookmark error:', result.error);
      alert(result.error);
    }
  };

  // Tooltip text
  const getTooltip = () => {
    if (!user) return 'Sign in to bookmark';
    if (bookmarked) {
      return isFavorite ? 'Favorited - click to unbookmark' : 'Bookmarked - click to remove';
    }
    if (usage?.isNearLimit) {
      return `Add to bookmarks (${usage.total}/${usage.limit})`;
    }
    return `Bookmark this ${bookmarkData.itemType}`;
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'rounded-lg border-2 shadow-md transition-all',
        'bg-bg-secondary/80 backdrop-blur-sm',
        bookmarked
          ? isFavorite
            ? 'border-amber-500 text-amber-500 hover:border-amber-600 hover:text-amber-600 hover:shadow-lg'
            : 'border-accent-red text-accent-red hover:border-accent-red-hover hover:text-accent-red-hover hover:shadow-lg'
          : 'border-border text-text-primary hover:text-accent-red hover:border-accent-red hover:shadow-lg',
        isAnimating && 'scale-110',
        paddingSizes[size],
        className
      )}
      title={getTooltip()}
      aria-label={getTooltip()}
    >
      <div className="flex items-center gap-2">
        <Bookmark
          size={iconSizes[size]}
          className={cn(
            'transition-all',
            isAnimating && 'animate-bounce',
            bookmarked && 'fill-current'
          )}
        />
        {showLabel && (
          <span className="text-sm font-medium">
            {bookmarked ? 'Bookmarked' : 'Bookmark'}
          </span>
        )}
      </div>

      {/* Usage indicator for near-limit users */}
      {!bookmarked && usage && usage.isNearLimit && !usage.isAtLimit && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
          <span className="text-[10px] font-bold text-white">
            {(usage.limit || 0) - usage.total}
          </span>
        </div>
      )}
    </button>
  );
}

/**
 * Upgrade prompt for users at limit
 */
export function BookmarkLimitPrompt({
  tier,
  currentCount,
  limit,
}: {
  tier: string;
  currentCount: number;
  limit: number;
}) {
  return (
    <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
      <div className="flex items-start gap-3">
        <Bookmark className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-text-primary mb-1">
            Bookmark Limit Reached
          </h4>
          <p className="text-sm text-text-secondary mb-3">
            You've used all {limit} bookmarks on the {tier} tier ({currentCount}/{limit}).
          </p>
          <a
            href="/pricing"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-red text-white rounded-lg hover:bg-accent-red-hover transition-colors text-sm font-medium"
          >
            Upgrade to {tier === 'FREE' ? 'BASIC or PRO' : 'PRO'}
          </a>
        </div>
      </div>
    </div>
  );
}
