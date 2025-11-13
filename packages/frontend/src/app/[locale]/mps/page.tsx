/**
 * MPs list page
 * Fully bilingual with Quebec French support
 */

'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loading } from '@/components/Loading';
import { Card } from '@canadagpt/design-system';
import { SEARCH_MPS } from '@/lib/queries';
import { Search, Crown, Eye, EyeOff } from 'lucide-react';
import { MPCard } from '@/components/MPCard';
import { PartyFilterButtons } from '@/components/PartyFilterButtons';
import { MyMPSection } from '@/components/mps/MyMPSection';
import { useAuth } from '@/contexts/AuthContext';

export default function MPsPage() {
  const t = useTranslations('mps');
  const tCommon = useTranslations('common');
  const { user } = useAuth();
  const { update: updateSession } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [partyFilter, setPartyFilter] = useState<string[]>([]);
  const [cabinetOnly, setCabinetOnly] = useState(false);

  // Initialize from user profile, fall back to localStorage for non-logged-in users
  const [showMyMP, setShowMyMP] = useState(() => {
    if (user?.show_my_mp_section !== undefined) {
      return user.show_my_mp_section;
    }
    // Fallback for non-logged-in users
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('showMyMPSection');
      return stored === null ? true : stored === 'true';
    }
    return true;
  });

  // Update state when user profile changes
  useEffect(() => {
    if (user?.show_my_mp_section !== undefined) {
      setShowMyMP(user.show_my_mp_section);
    }
  }, [user?.show_my_mp_section]);

  // Toggle and persist to database (or localStorage for non-logged-in users)
  const toggleMyMP = async () => {
    const newValue = !showMyMP;
    setShowMyMP(newValue);

    if (user) {
      // Save to database for logged-in users
      try {
        const response = await fetch('/api/user/profile', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            show_my_mp_section: newValue,
          }),
        });

        if (response.ok) {
          // Refresh the session to update the token
          await updateSession();
        } else {
          console.error('Failed to update profile preference');
          // Revert on error
          setShowMyMP(!newValue);
        }
      } catch (error) {
        console.error('Error updating profile:', error);
        // Revert on error
        setShowMyMP(!newValue);
      }
    } else {
      // Fall back to localStorage for non-logged-in users
      localStorage.setItem('showMyMPSection', String(newValue));
    }
  };

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

        return partyFilter.some(selectedParty => {
          const normalizedSelected = normalizePartyName(selectedParty);
          // Exact match or partial match (e.g., "bloc" matches "bloc quebecois")
          return normalizedMpParty === normalizedSelected ||
                 normalizedMpParty.includes(normalizedSelected) ||
                 normalizedSelected.includes(normalizedMpParty);
        });
      });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 page-container">
        {/* Header with Toggle */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-text-primary">{t('title')}</h1>
          </div>

          {/* My MP Toggle Button */}
          <button
            onClick={toggleMyMP}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-bg-secondary border-2 border-border-subtle hover:border-accent-red text-text-primary"
            title={showMyMP ? 'Hide My MP section' : 'Show My MP section'}
          >
            {showMyMP ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="hidden sm:inline">My MP</span>
          </button>
        </div>

        <p className="text-text-secondary mb-8">{t('subtitle', { count: filteredMPs.length || 343 })}</p>

        {/* My MP Section - conditionally rendered */}
        {showMyMP && (
          <div className="mb-8">
            <MyMPSection />
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 space-y-4">
          {/* Search and Cabinet Filter Row */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
              <input
                type="text"
                placeholder={t('search.placeholder')}
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
              {t('filters.cabinet')}
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
            <p className="text-accent-red">{t('search.error')}</p>
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
            <p className="text-text-secondary text-center">{t('search.noResults')}</p>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
