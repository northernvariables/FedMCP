/**
 * BillSquare Component
 * Displays a single bill as a rounded square in the GANTT visualization
 */

'use client';

import React from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { BillGanttData } from '@/lib/billGanttUtils';
import { ShareButton } from '@/components/ShareButton';
import { BookmarkButton } from '@/components/bookmarks/BookmarkButton';
import { PartyLogo } from '@/components/PartyLogo';

interface BillPosition {
  column: number; // Stage column position (%)
  row: number; // Row within column (0-2)
  col: number; // Horizontal offset within stage (for multiple bills)
}

interface BillSquareProps {
  bill: BillGanttData;
  gridPosition: BillPosition;
  swimlane: 'house' | 'committee' | 'senate';
}

export function BillSquare({ bill, gridPosition, swimlane }: BillSquareProps) {
  const locale = useLocale();
  const title = (locale === 'fr' ? bill.title_fr : bill.title) || bill.title || '';
  const status = (locale === 'fr' ? bill.status_fr : bill.status) || bill.status || '';
  const billType = (locale === 'fr' ? bill.bill_type_fr : bill.bill_type) || bill.bill_type || '';
  const [isHovered, setIsHovered] = React.useState(false);

  // Color based on bill type
  const getBillColors = () => {
    // Government Bill - Green
    if (bill.is_government_bill && !billType.toLowerCase().includes('senate')) {
      return {
        bg: 'bg-green-500 hover:bg-green-600',
        border: 'border-green-400',
      };
    }

    // Private Member's Bill - Gold/Amber
    if (billType === "Private Member's Bill" || billType === "Projet de loi d'initiative parlementaire") {
      return {
        bg: 'bg-amber-500 hover:bg-amber-600',
        border: 'border-amber-400',
      };
    }

    // Senate Government Bill - Red
    if (billType === 'Senate Government Bill' || billType === 'Projet de loi du gouvernement du Sénat') {
      return {
        bg: 'bg-red-500 hover:bg-red-600',
        border: 'border-red-400',
      };
    }

    // Senate Public Bill - Orange
    if (billType === 'Senate Public Bill' || billType === 'Projet de loi public du Sénat') {
      return {
        bg: 'bg-orange-500 hover:bg-orange-600',
        border: 'border-orange-400',
      };
    }

    // Default fallback - Blue
    return {
      bg: 'bg-blue-500 hover:bg-blue-600',
      border: 'border-blue-400',
    };
  };

  const { bg: bgColor, border: borderColor } = getBillColors();

  // Calculate position based on grid
  const SQUARE_SIZE = 32; // 32px square
  const SPACING = 5; // 5px spacing between squares
  const TOTAL_SIZE = SQUARE_SIZE + SPACING; // 37px total per square

  // Horizontal position: column position + offset for multiple bills in same stage
  const leftPosition = `calc(${gridPosition.column}% + ${gridPosition.col * TOTAL_SIZE}px)`;

  // Vertical position: offset from top, with 5px spacing between rows
  // Start at top edge, then offset by row
  const topPosition = gridPosition.row * TOTAL_SIZE; // 0px from top, then 37px per row

  return (
    <div
      className="absolute group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        left: leftPosition,
        top: `${topPosition}px`,
        transform: 'translateX(-50%)',
        zIndex: isHovered ? 10000 : 1,
      }}
    >
      {/* Compact square (always visible) */}
      <div
        className={`
          w-8 h-8 rounded-md
          ${bgColor}
          border ${borderColor}
          flex items-center justify-center
          shadow-md
          transition-all duration-200
          cursor-pointer
          relative
        `}
      >
        <span className="text-white font-semibold text-[10px] text-center leading-tight">
          {bill.number}
        </span>
      </div>

      {/* Expanded view on hover - positioned outside container */}
      <div
        className="
          absolute left-1/2 top-0 -translate-x-1/2
          opacity-0 group-hover:opacity-100
          transition-opacity duration-200
        "
        style={{ pointerEvents: isHovered ? 'auto' : 'none' }}
      >
        <div
          className={`
            w-64 rounded-md
            ${bgColor}
            border-2 ${borderColor}
            p-4
            shadow-2xl
            flex flex-col gap-3
            relative
          `}
        >
          {/* Action buttons in top-right corner */}
          <div className="absolute top-2 right-2 flex gap-2">
            <BookmarkButton
              bookmarkData={{
                itemType: 'bill',
                itemId: `${bill.session}-${bill.number}`,
                title: `Bill ${bill.number}`,
                subtitle: String(title),
                url: `/${locale}/bills/${bill.session}/${bill.number}`,
                metadata: {
                  session: bill.session,
                  bill_type: billType,
                  status: status,
                  sponsor: bill.sponsor?.name,
                  party: bill.sponsor?.party,
                  is_government_bill: bill.is_government_bill,
                },
              }}
              size="sm"
            />
            <ShareButton
              url={`/${locale}/bills/${bill.session}/${bill.number}`}
              title={`Bill ${bill.number} - ${String(title)}`}
              description={String(status)}
              size="sm"
            />
          </div>

          <div className="text-sm font-semibold text-white line-clamp-3 pr-20">
            {bill.number}: {String(title)}
          </div>

          {bill.sponsor && (
            <div className="text-xs text-white/90 pr-12">
              {String(bill.sponsor.name)} ({String(bill.sponsor.party)})
            </div>
          )}

          <div className="text-xs text-white/80 pr-12">{String(status)}</div>

          {/* Activity indicators */}
          <div className="flex gap-2 text-xs text-white/90 pr-12">
            {bill.hansardDebatesAggregate && bill.hansardDebatesAggregate.count > 0 && (
              <span>💬 {bill.hansardDebatesAggregate.count}</span>
            )}
            {bill.votesAggregate && bill.votesAggregate.count > 0 && (
              <span>🗳️ {bill.votesAggregate.count}</span>
            )}
            {bill.referredTo && bill.referredTo.length > 0 && (
              <span>👥 Committee</span>
            )}
          </div>

          {/* Sponsor Party Logo - Left aligned */}
          {bill.sponsor?.party && (
            <div className="flex items-center">
              <PartyLogo
                party={bill.sponsor.party}
                size="sm"
                linkTo={undefined}
              />
            </div>
          )}

          {/* Button to bill page */}
          <Link
            href={`/bills/${bill.session}/${bill.number}` as any}
            className="mt-2 px-3 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-md transition-colors text-center"
          >
            View Details →
          </Link>
        </div>
      </div>
    </div>
  );
}
