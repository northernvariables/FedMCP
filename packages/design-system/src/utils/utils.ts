/**
 * Utility functions for the Canada GPT design system
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with proper precedence
 *
 * This function combines clsx for conditional classes and tailwind-merge
 * for intelligent Tailwind class merging (e.g., handles conflicts like "p-4 p-2" → "p-2")
 *
 * @example
 * cn('px-4 py-2', 'bg-accent-red', isActive && 'bg-accent-red-hover')
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in Canadian dollars
 *
 * @example
 * formatCAD(1234567.89) // "$1,234,567.89"
 * formatCAD(1234567.89, { compact: true }) // "$1.2M"
 */
export function formatCAD(
  amount: number,
  options?: { compact?: boolean; showCents?: boolean }
): string {
  const { compact = false, showCents = true } = options || {};

  if (compact) {
    // Compact notation: $1.2M, $345K
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  }

  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(amount);
}

/**
 * Format date in Canadian format (YYYY-MM-DD)
 *
 * @example
 * formatDate(new Date('2025-11-02')) // "November 2, 2025"
 * formatDate('2025-11-02', { short: true }) // "Nov 2, 2025"
 */
export function formatDate(
  date: Date | string,
  options?: { short?: boolean; yearOnly?: boolean }
): string {
  const { short = false, yearOnly = false } = options || {};
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (yearOnly) {
    return dateObj.getFullYear().toString();
  }

  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: short ? 'short' : 'long',
    day: 'numeric',
  }).format(dateObj);
}

/**
 * Truncate text with ellipsis
 *
 * @example
 * truncate('Long text here', 10) // "Long text..."
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Pluralize a word based on count
 *
 * @example
 * pluralize(1, 'bill') // "1 bill"
 * pluralize(2, 'bill') // "2 bills"
 * pluralize(2, 'party', 'parties') // "2 parties"
 */
export function pluralize(
  count: number,
  singular: string,
  plural?: string
): string {
  const word = count === 1 ? singular : (plural || `${singular}s`);
  return `${count} ${word}`;
}
