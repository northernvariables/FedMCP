/**
 * PartyLogo Component
 *
 * Displays a party logo or branded badge with consistent styling
 * Supports different sizes and optional linking
 */

'use client';

import Link from 'next/link';
import { getPartyInfo, getPartySlug } from '@/lib/partyConstants';

export interface PartyLogoProps {
  party: string | null | undefined;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  linkTo?: 'party' | 'filter' | string;
  showLabel?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
  xl: 'h-12 w-12 text-lg',
};

const labelSizes = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
};

/**
 * Get party initials for badge display
 */
function getPartyInitials(partyName: string): string {
  const initials: Record<string, string> = {
    'Liberal': 'L',
    'Conservative': 'C',
    'NDP': 'NDP',
    'Bloc Québécois': 'BQ',
    'Green': 'G',
    'Independent': 'I',
  };

  return initials[partyName] || partyName.charAt(0).toUpperCase();
}

export function PartyLogo({
  party,
  size = 'md',
  linkTo,
  showLabel = false,
  className = '',
}: PartyLogoProps) {
  const partyInfo = getPartyInfo(party);

  if (!partyInfo) return null;

  const initials = getPartyInitials(partyInfo.name);

  // Build the link URL if linkTo is specified
  let href: string | undefined;
  if (linkTo === 'party') {
    href = `/parties/${partyInfo.slug}`;
  } else if (linkTo === 'filter') {
    href = `/mps?party=${encodeURIComponent(partyInfo.name)}`;
  } else if (linkTo && linkTo !== 'party' && linkTo !== 'filter') {
    href = linkTo;
  }

  const badge = (
    <div
      className={`flex items-center justify-center rounded-md font-bold ${sizeClasses[size]} ${className} ${
        href ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
      }`}
      style={{
        backgroundColor: partyInfo.color,
        color: partyInfo.textColor,
      }}
      title={partyInfo.fullName}
    >
      {initials}
    </div>
  );

  const content = showLabel ? (
    <div className="flex items-center gap-2">
      {badge}
      <span className={`font-medium ${labelSizes[size]}`} style={{ color: partyInfo.color }}>
        {partyInfo.name}
      </span>
    </div>
  ) : (
    badge
  );

  if (href) {
    return (
      <Link href={href} className="inline-block">
        {content}
      </Link>
    );
  }

  return content;
}

/**
 * PartyBadge Component
 *
 * Alternative component for larger, pill-shaped party badges
 * Similar to cabinet position badges
 */
export interface PartyBadgeProps {
  party: string | null | undefined;
  linkTo?: 'party' | 'filter' | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const badgeSizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
};

export function PartyBadge({
  party,
  linkTo,
  size = 'sm',
  className = '',
}: PartyBadgeProps) {
  const partyInfo = getPartyInfo(party);

  if (!partyInfo) return null;

  // Build the link URL if linkTo is specified
  let href: string | undefined;
  if (linkTo === 'party') {
    href = `/parties/${partyInfo.slug}`;
  } else if (linkTo === 'filter') {
    href = `/mps?party=${encodeURIComponent(partyInfo.name)}`;
  } else if (linkTo && linkTo !== 'party' && linkTo !== 'filter') {
    href = linkTo;
  }

  const badge = (
    <span
      className={`inline-flex items-center rounded-full font-medium ${badgeSizeClasses[size]} ${className} ${
        href ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''
      }`}
      style={{
        backgroundColor: partyInfo.color,
        color: partyInfo.textColor,
      }}
    >
      {partyInfo.name}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block">
        {badge}
      </Link>
    );
  }

  return badge;
}
