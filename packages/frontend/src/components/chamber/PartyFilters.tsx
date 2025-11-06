/**
 * Party filters and MP search for the seating chart
 */

'use client';

import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@canadagpt/design-system';

interface PartyFiltersProps {
  onPartyFilter: (party: string | null) => void;
  onSearch: (query: string) => void;
  selectedParty: string | null;
  searchQuery: string;
}

const PARTIES = [
  { name: 'Liberal', color: '#D71920', hex: true },
  { name: 'Conservative', color: '#002395', hex: true },
  { name: 'NDP', color: '#F37021', hex: true },
  { name: 'Bloc Québécois', color: '#33B2CC', hex: true },
  { name: 'Green', color: '#3D9B35', hex: true },
];

export function PartyFilters({
  onPartyFilter,
  onSearch,
  selectedParty,
  searchQuery,
}: PartyFiltersProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    onSearch(value);
  };

  const handleClearFilters = () => {
    setLocalSearch('');
    onSearch('');
    onPartyFilter(null);
  };

  const hasActiveFilters = selectedParty || searchQuery;

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
        <input
          type="text"
          placeholder="Search MPs..."
          value={localSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full pl-10 pr-10 py-2 bg-bg-elevated border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-red focus:border-transparent"
        />
        {localSearch && (
          <button
            onClick={() => handleSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Party Filter Buttons */}
      <div>
        <div className="flex flex-wrap gap-2">
          {PARTIES.map((party) => (
            <button
              key={party.name}
              onClick={() =>
                onPartyFilter(selectedParty === party.name ? null : party.name)
              }
              style={{
                backgroundColor: selectedParty === party.name ? party.color : undefined,
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedParty === party.name
                  ? 'text-white'
                  : 'bg-bg-elevated hover:bg-bg-elevated/80 text-text-primary border border-border'
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  style={{ backgroundColor: party.color }}
                  className={`w-3 h-3 rounded-full ${
                    selectedParty === party.name ? 'ring-2 ring-white' : ''
                  }`}
                />
                {party.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          onClick={handleClearFilters}
          className="w-full"
        >
          <X className="h-4 w-4 mr-2" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}
