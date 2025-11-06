/**
 * PartyFilterButtons Component
 *
 * Horizontal scrollable button group for filtering MPs by party
 * Displays party logos with active/inactive states
 * Matches design pattern of Cabinet Only button
 */

'use client';

import { getMajorParties, getPartyInfo, getPartyStyles } from '@/lib/partyConstants';

export interface PartyFilterButtonsProps {
  selected: string[];
  onSelect: (parties: string[]) => void;
  showAllOption?: boolean;
  className?: string;
}

export function PartyFilterButtons({
  selected,
  onSelect,
  showAllOption = true,
  className = '',
}: PartyFilterButtonsProps) {
  const parties = getMajorParties();

  const handleToggle = (partyName: string) => {
    if (selected.includes(partyName)) {
      // Remove party from selection
      onSelect(selected.filter((p) => p !== partyName));
    } else {
      // Add party to selection
      onSelect([...selected, partyName]);
    }
  };

  return (
    <div className={`flex items-center gap-2 overflow-x-auto pb-2 py-1 justify-end ${className}`}>
      {/* All Parties Button */}
      {showAllOption && (
        <button
          onClick={() => onSelect([])}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all border-2 ${
            selected.length === 0
              ? 'bg-bg-elevated text-text-primary border-border-default'
              : 'bg-bg-secondary text-text-secondary border-border-subtle hover:border-border-default'
          }`}
        >
          All Parties
        </button>
      )}

      {/* Party Filter Buttons */}
      {parties.map((party) => {
        const isActive = selected.includes(party.name);

        return (
          <button
            key={party.slug}
            onClick={() => handleToggle(party.name)}
            className={`flex items-center justify-center w-10 h-10 rounded-lg font-bold text-sm transition-all ${
              isActive ? 'ring-2 ring-offset-2' : 'opacity-60 hover:opacity-100'
            }`}
            style={{
              backgroundColor: party.color,
              color: party.textColor,
              ...(isActive && { ringColor: party.color }),
            }}
            title={party.fullName}
          >
            {party.name === 'NDP' ? 'NDP' : party.name === 'Bloc Québécois' ? 'BQ' : party.name.charAt(0)}
          </button>
        );
      })}
    </div>
  );
}

/**
 * CompactPartyFilterButtons Component
 *
 * Smaller version with just logo badges for dashboard/header use
 */
export interface CompactPartyFilterButtonsProps {
  selected: string[];
  onSelect: (parties: string[]) => void;
  className?: string;
}

export function CompactPartyFilterButtons({
  selected,
  onSelect,
  className = '',
}: CompactPartyFilterButtonsProps) {
  const parties = getMajorParties();

  const handleToggle = (partyName: string) => {
    if (selected.includes(partyName)) {
      // Remove party from selection
      onSelect(selected.filter((p) => p !== partyName));
    } else {
      // Add party to selection
      onSelect([...selected, partyName]);
    }
  };

  return (
    <div className={`flex items-center gap-2 py-1 justify-end ${className}`}>
      {parties.map((party) => {
        const isActive = selected.includes(party.name);

        return (
          <button
            key={party.slug}
            onClick={() => handleToggle(party.name)}
            className={`flex items-center justify-center w-10 h-10 rounded-lg font-bold text-sm transition-all ${
              isActive ? 'ring-2 ring-offset-2' : 'opacity-60 hover:opacity-100'
            }`}
            style={{
              backgroundColor: party.color,
              color: party.textColor,
              ...(isActive && { ringColor: party.color }),
            }}
            title={party.fullName}
          >
            {party.name === 'NDP' ? 'NDP' : party.name === 'Bloc Québécois' ? 'BQ' : party.name.charAt(0)}
          </button>
        );
      })}
    </div>
  );
}
