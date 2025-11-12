/**
 * Question Period Interjections Leaderboard
 * Ranks MPs by their frequency of interjections during Oral Question Period
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loading } from '@/components/Loading';
import { Card } from '@canadagpt/design-system';
import { GET_INTERJECTION_LEADERBOARD } from '@/lib/queries';
import { PartyFilterButtons } from '@/components/PartyFilterButtons';
import { MessageSquare } from 'lucide-react';

export default function InterjectionsLeaderboardPage() {
  const t = useTranslations('mps');
  const tCommon = useTranslations('common');
  const [partyFilter, setPartyFilter] = useState<string[]>([]);

  // Fetch interjection leaderboard
  const { data, loading, error } = useQuery(GET_INTERJECTION_LEADERBOARD, {
    variables: {
      party: partyFilter.length === 1 ? partyFilter[0] : null,
      limit: 100,
    },
  });

  // Normalize party name to handle accent variations
  const normalizePartyName = (name: string | undefined) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  // Client-side filtering for multi-select parties
  const filteredMPs =
    partyFilter.length === 0 || partyFilter.length === 1
      ? data?.mpInterjectionLeaderboard || []
      : (data?.mpInterjectionLeaderboard || []).filter((item: any) => {
          const mpParty = item.mp.party;
          const normalizedMpParty = normalizePartyName(mpParty);

          return partyFilter.some((selectedParty) => {
            const normalizedSelected = normalizePartyName(selectedParty);
            return (
              normalizedMpParty === normalizedSelected ||
              normalizedMpParty.includes(normalizedSelected) ||
              normalizedSelected.includes(normalizedMpParty)
            );
          });
        });

  // Get party color
  const getPartyColor = (party: string | undefined) => {
    if (!party) return 'text-text-tertiary';
    const normalized = normalizePartyName(party);
    if (normalized.includes('liberal')) return 'text-red-600';
    if (normalized.includes('conservative')) return 'text-blue-600';
    if (normalized.includes('ndp') || normalized.includes('new democratic'))
      return 'text-orange-600';
    if (normalized.includes('bloc')) return 'text-cyan-600';
    if (normalized.includes('green')) return 'text-green-600';
    return 'text-text-tertiary';
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 page-container">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-text-primary mb-2">
            Question Period Interjections
          </h1>
          <p className="text-text-secondary">
            MPs ranked by their frequency of interjections during Oral Question Period
          </p>
        </div>

        {/* Party Filter */}
        <div className="mb-6">
          <PartyFilterButtons
            selected={partyFilter}
            onSelect={(parties) => setPartyFilter(parties)}
          />
        </div>

        {/* Leaderboard Table */}
        {loading ? (
          <Loading />
        ) : error ? (
          <Card>
            <p className="text-accent-red">
              Error loading interjection data. Please try again.
            </p>
          </Card>
        ) : filteredMPs.length === 0 ? (
          <Card>
            <p className="text-text-secondary text-center">
              No data available for the selected filters.
            </p>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-secondary">
                      Rank
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-secondary">
                      MP
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-secondary">
                      Party
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-secondary">
                      Riding
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-text-secondary">
                      <div className="flex items-center justify-end gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Interjections
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMPs.map((item: any, index: number) => (
                    <tr
                      key={item.mp.id}
                      className="border-b border-border-subtle hover:bg-bg-secondary transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="text-lg font-bold text-text-tertiary">
                          #{index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/mps/${item.mp.id}`}
                          className="text-accent-red hover:underline font-medium"
                        >
                          {item.mp.name}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-medium ${getPartyColor(item.mp.party)}`}>
                          {item.mp.party || 'Independent'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-text-secondary">
                        {item.mp.riding}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-lg font-bold text-text-primary">
                          {item.interjection_count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Info Box */}
        <Card className="mt-6">
          <div className="text-sm text-text-secondary space-y-2">
            <p className="font-semibold text-text-primary">About this data:</p>
            <p>
              Interjections are remarks made by MPs during Question Period while another
              member has the floor. They are recorded in Hansard transcripts with the
              statement type "interjection".
            </p>
            <p>
              This leaderboard only counts interjections made during Oral Question Period
              sessions, not during general debates or other proceedings.
            </p>
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
