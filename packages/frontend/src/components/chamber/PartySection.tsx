/**
 * PartySection Component
 *
 * Displays a party's MPs in a branded section with:
 * - Party color header with logo
 * - Seat count
 * - Grid of MPs using CompactMPCard
 */

'use client';

import { Card } from '@canadagpt/design-system';
import { getPartyInfo } from '@/lib/partyConstants';
import { CompactMPCard, MPCardData } from '@/components/MPCard';

export interface PartySectionProps {
  partyName: string;
  mps: MPCardData[];
  className?: string;
}

export function PartySection({ partyName, mps, className = '' }: PartySectionProps) {
  const partyInfo = getPartyInfo(partyName);

  if (!partyInfo) return null;

  // Sort MPs: Cabinet first, then alphabetically
  const sortedMPs = [...mps].sort((a, b) => {
    // Cabinet members first
    if (a.cabinet_position && !b.cabinet_position) return -1;
    if (!a.cabinet_position && b.cabinet_position) return 1;
    // Then alphabetically by name
    return a.name.localeCompare(b.name);
  });

  return (
    <Card className={`overflow-hidden ${className}`}>
      {/* Party Header */}
      <div
        className="px-6 py-4 -m-6 mb-4"
        style={{
          backgroundColor: partyInfo.color,
          color: partyInfo.textColor,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Party Logo Badge */}
            <div
              className="flex items-center justify-center w-12 h-12 rounded-lg font-bold text-lg bg-white/20"
              style={{ color: partyInfo.textColor }}
            >
              {partyInfo.name === 'NDP' ? 'NDP' : partyInfo.name === 'Bloc Québécois' ? 'BQ' : partyInfo.name.charAt(0)}
            </div>

            <div>
              <h2 className="text-2xl font-bold">{partyInfo.fullName}</h2>
              <p className="text-sm opacity-90">
                {mps.length} {mps.length === 1 ? 'seat' : 'seats'}
              </p>
            </div>
          </div>

          {/* Seat Count Badge */}
          <div className="text-right">
            <div className="text-4xl font-bold">{mps.length}</div>
            <div className="text-xs opacity-90">SEATS</div>
          </div>
        </div>
      </div>

      {/* MPs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {sortedMPs.map((mp) => (
          <CompactMPCard key={mp.id} mp={mp} linkToParty={false} />
        ))}
      </div>
    </Card>
  );
}
