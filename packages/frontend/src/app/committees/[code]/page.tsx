/**
 * Individual Committee detail page
 */

'use client';

import { use } from 'react';
import { useQuery } from '@apollo/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loading } from '@/components/Loading';
import { Card } from '@canadagpt/design-system';
import { GET_COMMITTEE } from '@/lib/queries';
import Link from 'next/link';
import { Users, FileText, Building2 } from 'lucide-react';
import { PartyLogo } from '@/components/PartyLogo';

export default function CommitteeDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);

  const { data, loading, error } = useQuery(GET_COMMITTEE, {
    variables: { code },
  });

  const committee = data?.committees?.[0];

  if (loading) {
    return (
      <>
        <Header />
        <Loading />
        <Footer />
      </>
    );
  }

  if (error || !committee) {
    return (
      <>
        <Header />
        <div className="page-container">
          <Card>
            <p className="text-accent-red">Committee not found</p>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 page-container">
        {/* Committee Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-4xl font-bold text-text-primary">{committee.name}</h1>
            <span className={`text-sm px-3 py-1 rounded ${
              committee.chamber === 'House'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}>
              {committee.chamber}
            </span>
          </div>
          <p className="text-lg text-text-secondary mb-2">
            Code: {committee.code}
          </p>
          {committee.mandate && (
            <p className="text-base text-text-secondary mt-4 max-w-4xl">
              {committee.mandate}
            </p>
          )}
        </div>

        {/* Committee Members - Org Chart Style */}
        {committee.members && committee.members.length > 0 && (() => {
          // Deduplicate members - show each MP only once with their highest-priority role
          const uniqueMembers = new Map();
          const rolePriority: Record<string, number> = {
            'Chair': 1,
            'Co-Chair': 2,
            '2nd Vice-Chair': 3,
            'Vice-Chair': 4,
            'Member': 5
          };

          committee.members.forEach((member: any) => {
            const role = member.servedOnConnection?.edges?.[0]?.properties?.role || 'Member';
            const existing = uniqueMembers.get(member.id);

            if (!existing || (rolePriority[role] || 999) < (rolePriority[existing.role] || 999)) {
              uniqueMembers.set(member.id, { ...member, role });
            }
          });

          const deduplicatedMembers = Array.from(uniqueMembers.values());

          // Group members by role
          const chairs = deduplicatedMembers.filter(m => m.role === 'Chair' || m.role === 'Co-Chair');
          const viceChairs = deduplicatedMembers.filter(m => m.role === 'Vice-Chair' || m.role === '2nd Vice-Chair');
          const members = deduplicatedMembers.filter(m => m.role === 'Member');

          // Member Card Component
          const MemberCard = ({ member, large = false }: { member: any; large?: boolean }) => (
            <Link
              href={`/mps/${member.id}`}
              className="block group"
            >
              <div className="flex flex-col items-center text-center">
                {/* Photo with role badge */}
                <div className="relative mb-3">
                  {member.photo_url ? (
                    <img
                      src={member.photo_url}
                      alt={member.name}
                      className={`${large ? 'w-28 h-36' : 'w-24 h-32'} rounded-lg object-cover bg-bg-elevated border-2 border-bg-elevated group-hover:border-accent-red transition-colors`}
                    />
                  ) : (
                    <div className={`${large ? 'w-28 h-36' : 'w-24 h-32'} rounded-lg bg-bg-elevated border-2 border-bg-elevated group-hover:border-accent-red transition-colors flex items-center justify-center`}>
                      <Users className="h-12 w-12 text-text-secondary" />
                    </div>
                  )}
                  {/* Role badge */}
                  <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                    member.role === 'Chair' || member.role === 'Co-Chair'
                      ? 'bg-accent-red text-white'
                      : member.role === 'Vice-Chair' || member.role === '2nd Vice-Chair'
                      ? 'bg-yellow-500/90 text-black'
                      : 'bg-gray-500/90 text-white'
                  }`}>
                    {member.role}
                  </div>
                </div>

                {/* Member info */}
                <div className={`${large ? 'w-36' : 'w-32'}`}>
                  <div className="font-semibold text-text-primary group-hover:text-accent-red transition-colors mb-1 flex items-center justify-center gap-1">
                    <span className="line-clamp-2">{member.name}</span>
                    <PartyLogo party={member.party} size="sm" className="flex-shrink-0" />
                  </div>
                  <p className="text-xs text-text-secondary line-clamp-1">
                    {member.party}
                  </p>
                  <p className="text-xs text-text-secondary line-clamp-1">
                    {member.riding}
                  </p>
                  {member.cabinet_position && (
                    <p className="text-xs text-accent-red mt-1 line-clamp-1">
                      {member.cabinet_position}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          );

          return (
            <Card className="mb-6">
              <h2 className="text-2xl font-bold text-text-primary mb-8 flex items-center">
                <Users className="h-6 w-6 mr-2 text-accent-red" />
                Committee Leadership & Members ({deduplicatedMembers.length})
              </h2>

              {/* Org Chart Layout */}
              <div className="space-y-8">
                {/* Chair(s) - Top Level */}
                {chairs.length > 0 && (
                  <div>
                    <div className="flex justify-center gap-8 mb-4">
                      {chairs.map((member: any) => (
                        <MemberCard key={member.id} member={member} large={true} />
                      ))}
                    </div>
                    {/* Connection line */}
                    {(viceChairs.length > 0 || members.length > 0) && (
                      <div className="h-8 flex items-center justify-center">
                        <div className="w-px h-full bg-border"></div>
                      </div>
                    )}
                  </div>
                )}

                {/* Vice-Chairs - Second Level */}
                {viceChairs.length > 0 && (
                  <div>
                    <div className="flex justify-center gap-6 flex-wrap mb-4">
                      {viceChairs.map((member: any) => (
                        <MemberCard key={member.id} member={member} />
                      ))}
                    </div>
                    {/* Connection line */}
                    {members.length > 0 && (
                      <div className="h-8 flex items-center justify-center">
                        <div className="w-px h-full bg-border"></div>
                      </div>
                    )}
                  </div>
                )}

                {/* Members - Bottom Level */}
                {members.length > 0 && (
                  <div>
                    <div className="border-t border-border pt-6">
                      <h3 className="text-lg font-semibold text-text-primary mb-4 text-center">
                        Committee Members ({members.length})
                      </h3>
                      <div className="flex justify-center">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                          {members.map((member: any) => (
                            <MemberCard key={member.id} member={member} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })()}

        {/* Bills Under Review */}
        {committee.bills && committee.bills.length > 0 && (
          <Card>
            <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
              <FileText className="h-6 w-6 mr-2 text-accent-red" />
              Bills Under Review ({committee.bills.length})
            </h2>

            <div className="space-y-3">
              {committee.bills.map((bill: any) => (
                <Link
                  key={`${bill.number}-${bill.session}`}
                  href={`/bills/${bill.session}/${bill.number}`}
                  className="block p-4 rounded-lg bg-bg-elevated hover:bg-bg-elevated/80 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-text-primary text-lg">
                      {bill.number}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      bill.status === 'Passed'
                        ? 'bg-green-500/20 text-green-400'
                        : bill.status === 'In Progress'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {bill.status}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary line-clamp-2">
                    {bill.title}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    Session: {bill.session}
                  </p>
                </Link>
              ))}
            </div>
          </Card>
        )}

        {/* Empty State for Bills */}
        {(!committee.bills || committee.bills.length === 0) && (
          <Card>
            <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
              <FileText className="h-6 w-6 mr-2 text-accent-red" />
              Bills Under Review
            </h2>
            <p className="text-text-secondary">No bills currently under review by this committee.</p>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
