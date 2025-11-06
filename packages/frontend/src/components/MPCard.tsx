/**
 * MPCard Component
 *
 * Reusable card component for displaying MP information
 * Features:
 * - MP photo, name, party, riding
 * - Cabinet position badge
 * - Party logo in top-right corner
 * - Clickable to MP profile
 */

import Link from 'next/link';
import { Card } from '@canadagpt/design-system';
import { Crown } from 'lucide-react';
import { PartyLogo } from './PartyLogo';

export interface MPCardData {
  id: string;
  name: string;
  party?: string | null;
  riding?: string | null;
  photo_url?: string | null;
  cabinet_position?: string | null;
}

export interface MPCardProps {
  mp: MPCardData;
  linkToParty?: boolean;
  className?: string;
}

export function MPCard({ mp, linkToParty = true, className = '' }: MPCardProps) {
  return (
    <Link href={`/mps/${mp.id}`}>
      <Card className={`hover:border-accent-red transition-colors cursor-pointer h-full relative ${className}`}>
        {/* Party Logo - Top Right Corner */}
        <div className="absolute top-3 right-3 z-10">
          <PartyLogo
            party={mp.party}
            size="md"
            linkTo={undefined}
          />
        </div>

        <div className="flex items-start space-x-4">
          {/* MP Photo */}
          {mp.photo_url && (
            <img
              src={mp.photo_url}
              alt={mp.name}
              className="w-[60px] h-24 rounded-lg object-contain flex-shrink-0 bg-bg-elevated"
            />
          )}

          {/* MP Info */}
          <div className="flex-1 min-w-0 pr-8">
            {/* Name */}
            <h3 className="font-semibold text-text-primary truncate">{mp.name}</h3>

            {/* Party */}
            <p className="text-sm text-text-secondary">{mp.party || 'Independent'}</p>

            {/* Riding */}
            <p className="text-sm text-text-tertiary truncate">{mp.riding || 'Riding TBD'}</p>

            {/* Cabinet Position Badge */}
            {mp.cabinet_position && (
              <div className="mt-2 flex items-center gap-1">
                <div className="inline-flex items-center gap-1 px-2 py-1 bg-accent-red text-white rounded-md text-xs font-medium">
                  <Crown className="h-3 w-3" />
                  <span className="line-clamp-1">{mp.cabinet_position}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

/**
 * CompactMPCard Component
 *
 * Smaller variant for chamber view and lists
 */
export interface CompactMPCardProps {
  mp: MPCardData;
  linkToParty?: boolean;
  className?: string;
}

export function CompactMPCard({ mp, linkToParty = true, className = '' }: CompactMPCardProps) {
  return (
    <Link href={`/mps/${mp.id}`}>
      <Card className={`hover:border-accent-red transition-colors cursor-pointer p-2 relative ${className}`}>
        {/* Party Logo Badge - Top Corner */}
        <div className="absolute top-2 right-2 z-10">
          <PartyLogo
            party={mp.party}
            size="sm"
            linkTo={undefined}
          />
        </div>

        {/* MP Photo */}
        {mp.photo_url && (
          <img
            src={mp.photo_url}
            alt={mp.name}
            className="w-full h-96 object-cover object-[50%_25%] rounded-md mb-2"
          />
        )}

        {/* MP Info */}
        <div>
          <h4 className="text-xs font-semibold text-text-primary truncate pr-6">{mp.name}</h4>
          <p className="text-xs text-text-tertiary truncate mt-0.5">{mp.riding || 'Riding TBD'}</p>

          {/* Cabinet Badge */}
          {mp.cabinet_position && (
            <div className="mt-1">
              <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-accent-red text-white rounded text-xs">
                <Crown className="h-2.5 w-2.5" />
              </div>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
