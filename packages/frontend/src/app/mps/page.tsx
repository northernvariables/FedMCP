/**
 * MPs list page
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loading } from '@/components/Loading';
import { Card } from '@canadagpt/design-system';
import { SEARCH_MPS } from '@/lib/queries';
import { Search, Crown } from 'lucide-react';
import { MPCard } from '@/components/MPCard';
import { PartyFilterButtons } from '@/components/PartyFilterButtons';

export default function MPsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [partyFilter, setPartyFilter] = useState<string[]>([]);
  const [cabinetOnly, setCabinetOnly] = useState(false);

  // Fetch all MPs and filter client-side for multi-select support
  const { data, loading, error} = useQuery(SEARCH_MPS, {
    variables: {
      searchTerm: searchTerm || null,
      current: true,
      cabinetOnly: cabinetOnly || null,
      limit: 500,
    },
  });

  // Normalize party name to handle accent variations (Québécois vs Quebecois)
  const normalizePartyName = (name: string | undefined) => {
    if (!name) return '';
    return name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
      .trim();
  };

  // Client-side filtering for multi-select parties
  const filteredMPs = partyFilter.length === 0
    ? data?.searchMPs || []
    : (data?.searchMPs || []).filter((mp: any) => {
        const mpParty = mp.party || mp.memberOf?.name;
        const normalizedMpParty = normalizePartyName(mpParty);

        return partyFilter.some(selectedParty =>
          normalizePartyName(selectedParty) === normalizedMpParty
        );
      });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 page-container">
        <h1 className="text-4xl font-bold text-text-primary mb-2">Members of Parliament</h1>
        <p className="text-text-secondary mb-8">Browse all {filteredMPs.length || 343} current MPs</p>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          {/* Search and Cabinet Filter Row */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border-subtle rounded-lg text-text-primary placeholder-text-tertiary focus:border-accent-red focus:outline-none transition-colors"
              />
            </div>

            {/* Cabinet filter */}
            <button
              onClick={() => setCabinetOnly(!cabinetOnly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                cabinetOnly
                  ? 'bg-accent-red text-white border-2 border-accent-red'
                  : 'bg-bg-secondary text-text-primary border-2 border-border-subtle hover:border-accent-red'
              }`}
            >
              <Crown className="h-4 w-4" />
              Cabinet Only
            </button>
          </div>

          {/* Party Filter Buttons */}
          <PartyFilterButtons
            selected={partyFilter}
            onSelect={(parties) => setPartyFilter(parties)}
          />
        </div>

        {/* MPs Grid */}
        {loading ? (
          <Loading />
        ) : error ? (
          <Card>
            <p className="text-accent-red">Error loading MPs: {error.message}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMPs.map((mp: any) => (
              <MPCard key={mp.id} mp={mp} />
            ))}
          </div>
        )}

        {filteredMPs.length === 0 && !loading && (
          <Card>
            <p className="text-text-secondary text-center">No MPs found matching your criteria.</p>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
