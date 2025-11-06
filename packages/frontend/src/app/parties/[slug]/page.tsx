/**
 * Party Dashboard Page
 *
 * Detailed overview of a specific political party including:
 * - Party information and branding
 * - Seat count and composition
 * - List of MPs
 * - Cabinet ministers from the party
 */

'use client';

import { useQuery } from '@apollo/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loading } from '@/components/Loading';
import { Card, StatCard } from '@canadagpt/design-system';
import { SEARCH_MPS } from '@/lib/queries';
import { getPartyInfo, getPartySlug } from '@/lib/partyConstants';
import { MPCard } from '@/components/MPCard';
import { Users, Crown, MapPin } from 'lucide-react';
import { notFound } from 'next/navigation';

interface PartyPageProps {
  params: {
    slug: string;
  };
}

export default function PartyPage({ params }: PartyPageProps) {
  // Find party by slug
  const partyInfo = Object.values(getPartyInfo('')?.constructor.prototype || {})
    .find((p: any) => getPartySlug(p.name) === params.slug);

  // Try to match slug to party
  let matchedPartyName: string | null = null;

  // Check each party's slug
  const parties = ['Liberal', 'Conservative', 'NDP', 'Bloc Québécois', 'Green', 'Independent'];
  for (const partyName of parties) {
    if (getPartySlug(partyName) === params.slug) {
      matchedPartyName = partyName;
      break;
    }
  }

  const targetPartyInfo = getPartyInfo(matchedPartyName);

  if (!targetPartyInfo) {
    notFound();
  }

  const { data, loading, error } = useQuery(SEARCH_MPS, {
    variables: {
      party: targetPartyInfo.name,
      current: true,
      limit: 500,
    },
  });

  const mps = data?.searchMPs || [];
  const cabinetMembers = mps.filter((mp: any) => mp.cabinet_position);
  const regularMembers = mps.filter((mp: any) => !mp.cabinet_position);

  // Calculate seat percentage (out of 338 total seats)
  const totalSeats = 338;
  const seatPercentage = mps.length > 0 ? ((mps.length / totalSeats) * 100).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 page-container">
        {/* Party Header */}
        <div
          className="rounded-lg p-8 mb-8 -mt-4"
          style={{
            backgroundColor: targetPartyInfo.color,
            color: targetPartyInfo.textColor,
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Party Logo Badge */}
              <div
                className="flex items-center justify-center w-20 h-20 rounded-xl font-bold text-3xl bg-white/20"
                style={{ color: targetPartyInfo.textColor }}
              >
                {targetPartyInfo.name === 'NDP' ? 'NDP' : targetPartyInfo.name === 'Bloc Québécois' ? 'BQ' : targetPartyInfo.name.charAt(0)}
              </div>

              <div>
                <h1 className="text-4xl font-bold mb-2">{targetPartyInfo.fullName}</h1>
                <p className="text-lg opacity-90">
                  {mps.length} {mps.length === 1 ? 'seat' : 'seats'} • {seatPercentage}% of Parliament
                </p>
              </div>
            </div>

            {/* Seat Count Badge */}
            <div className="text-right">
              <div className="text-6xl font-bold">{mps.length}</div>
              <div className="text-sm opacity-90">SEATS</div>
            </div>
          </div>
        </div>

        {loading ? (
          <Loading />
        ) : error ? (
          <Card>
            <p className="text-accent-red">Error loading party data: {error.message}</p>
          </Card>
        ) : (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <StatCard
                title="Total MPs"
                value={mps.length}
                icon={Users}
                subtitle="Current members"
              />
              <StatCard
                title="Cabinet Ministers"
                value={cabinetMembers.length}
                icon={Crown}
                subtitle="In federal cabinet"
              />
              <StatCard
                title="Ridings"
                value={mps.length}
                icon={MapPin}
                subtitle="Across Canada"
              />
            </div>

            {/* Cabinet Ministers Section */}
            {cabinetMembers.length > 0 && (
              <Card className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Crown className="h-6 w-6 text-accent-red" />
                  <h2 className="text-2xl font-bold text-text-primary">Cabinet Ministers</h2>
                  <span className="text-text-tertiary">({cabinetMembers.length})</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cabinetMembers.map((mp: any) => (
                    <MPCard key={mp.id} mp={mp} linkToParty={false} />
                  ))}
                </div>
              </Card>
            )}

            {/* All MPs Section */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-6 w-6" style={{ color: targetPartyInfo.color }} />
                <h2 className="text-2xl font-bold text-text-primary">All Members</h2>
                <span className="text-text-tertiary">({mps.length})</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mps.map((mp: any) => (
                  <MPCard key={mp.id} mp={mp} linkToParty={false} />
                ))}
              </div>
            </Card>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
