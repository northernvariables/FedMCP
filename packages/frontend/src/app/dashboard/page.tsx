/**
 * Dashboard page - Enhanced overview of government activity
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loading } from '@/components/Loading';
import { Card } from '@canadagpt/design-system';
import { StatCard } from '@/components/dashboard/StatCard';
import { GET_TOP_SPENDERS, SEARCH_MPS, SEARCH_BILLS, SEARCH_HANSARD } from '@/lib/queries';
import Link from 'next/link';
import { formatCAD } from '@canadagpt/design-system';
import { Users, FileText, Megaphone, DollarSign, TrendingUp, MessageSquare, Info } from 'lucide-react';
import { CompactMPCard } from '@/components/MPCard';
import { CompactPartyFilterButtons } from '@/components/PartyFilterButtons';

export default function DashboardPage() {
  // Use FY 2026 - expense data typically lags 2-3 months after quarter end
  const fiscalYear = 2026;

  // Party filter state - array for multi-select
  const [partyFilter, setPartyFilter] = useState<string[]>([]);

  const { data: spendersData, loading: spendersLoading } = useQuery(GET_TOP_SPENDERS, {
    variables: { fiscalYear, limit: 10 },
  });

  const { data: hansardData, loading: hansardLoading } = useQuery(SEARCH_HANSARD, {
    variables: { query: "government", limit: 10 },
  });

  // Get counts for metrics cards
  const { data: mpsData } = useQuery(SEARCH_MPS, {
    variables: { current: true, limit: 500 },
  });

  const { data: billsData } = useQuery(SEARCH_BILLS, {
    variables: { limit: 1000 },
  });

  // Featured MPs query - fetch all and filter client-side for multi-select
  const { data: featuredMPsData, loading: featuredMPsLoading } = useQuery(SEARCH_MPS, {
    variables: {
      current: true,
      limit: 100
    },
  });

  // Shuffle array using Fisher-Yates algorithm
  const shuffleArray = (array: any[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Client-side filtering for multi-select parties, then randomize
  const filteredMPs = partyFilter.length === 0
    ? shuffleArray(featuredMPsData?.searchMPs || [])
    : shuffleArray((featuredMPsData?.searchMPs || []).filter((mp: any) =>
        partyFilter.includes(mp.party || mp.memberOf?.name)
      ));

  const totalMPs = mpsData?.searchMPs?.length || 343;
  const totalBills = billsData?.searchBills?.filter((b: any) => b.title)?.length || 0;
  const activeBills = billsData?.searchBills?.filter(
    (b: any) => b.title && !['Passed', 'Royal Assent'].includes(b.status)
  )?.length || 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 page-container">
        <h1 className="text-4xl font-bold text-text-primary mb-2">Dashboard</h1>
        <p className="text-text-secondary mb-8">Government accountability metrics and insights</p>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Current MPs"
            value={totalMPs}
            icon={Users}
            subtitle="Members of Parliament"
            href="/mps"
          />
          <StatCard
            title="Total Bills"
            value={totalBills}
            icon={FileText}
            subtitle={`${activeBills} active`}
            href="/bills"
          />
          <StatCard
            title="Top Spender"
            value={spendersData?.topSpenders?.[0]
              ? formatCAD(spendersData.topSpenders[0].total_expenses, { compact: true })
              : '—'}
            icon={DollarSign}
            subtitle={`${fiscalYear} expenses`}
          />
          <StatCard
            title="Recent Speeches"
            value={hansardData?.searchHansard?.length || 0}
            icon={MessageSquare}
            subtitle="Hansard records"
            href="/hansard"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link href="/mps" className="group">
            <Card className="hover:border-accent-red transition-colors cursor-pointer text-center p-6">
              <Users className="h-8 w-8 text-accent-red mx-auto mb-2" />
              <h3 className="font-semibold text-text-primary group-hover:text-accent-red transition-colors">
                Browse MPs
              </h3>
              <p className="text-sm text-text-secondary mt-1">View all members</p>
            </Card>
          </Link>

          <Link href="/bills" className="group">
            <Card className="hover:border-accent-red transition-colors cursor-pointer text-center p-6">
              <FileText className="h-8 w-8 text-accent-red mx-auto mb-2" />
              <h3 className="font-semibold text-text-primary group-hover:text-accent-red transition-colors">
                Track Bills
              </h3>
              <p className="text-sm text-text-secondary mt-1">Follow legislation</p>
            </Card>
          </Link>

          <Link href="/lobbying" className="group">
            <Card className="hover:border-accent-red transition-colors cursor-pointer text-center p-6">
              <Megaphone className="h-8 w-8 text-accent-red mx-auto mb-2" />
              <h3 className="font-semibold text-text-primary group-hover:text-accent-red transition-colors">
                Lobbying
              </h3>
              <p className="text-sm text-text-secondary mt-1">Corporate influence</p>
            </Card>
          </Link>

          <Link href={`/spending?year=${fiscalYear}`} className="group">
            <Card className="hover:border-accent-red transition-colors cursor-pointer text-center p-6">
              <DollarSign className="h-8 w-8 text-accent-red mx-auto mb-2" />
              <h3 className="font-semibold text-text-primary group-hover:text-accent-red transition-colors">
                Spending
              </h3>
              <p className="text-sm text-text-secondary mt-1">MP expenses</p>
            </Card>
          </Link>
        </div>

        {/* Featured MPs Section */}
        <Card className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-text-primary">Featured MPs</h2>
            <Users className="h-6 w-6 text-accent-red" />
          </div>

          {/* Party Filter Buttons */}
          <div className="mb-4">
            <CompactPartyFilterButtons
              selected={partyFilter}
              onSelect={(parties) => setPartyFilter(parties)}
            />
          </div>

          {/* MPs Grid */}
          {featuredMPsLoading ? (
            <Loading />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3">
              {filteredMPs.slice(0, 8).map((mp: any) => (
                <CompactMPCard key={mp.id} mp={mp} />
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-border-subtle">
            <Link
              href="/mps"
              className="text-sm text-accent-red hover:text-accent-red-hover font-semibold"
            >
              View All MPs →
            </Link>
          </div>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Spenders */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-text-primary">
                Top Spenders {fiscalYear}
              </h2>
              <TrendingUp className="h-6 w-6 text-accent-red" />
            </div>

            {spendersLoading ? (
              <Loading />
            ) : (
              <div className="space-y-3">
                {spendersData?.topSpenders?.map((item: any, index: number) => (
                  <Link
                    key={item.mp.id}
                    href={`/mps/${item.mp.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-bg-elevated transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl font-bold text-text-tertiary w-6">
                        {index + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-text-primary group-hover:text-accent-red transition-colors">
                          {item.mp.name}
                        </div>
                        <div className="text-sm text-text-secondary">{item.mp.party}</div>
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-accent-red">
                      {formatCAD(item.total_expenses, { compact: true })}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-border-subtle">
              <Link
                href={`/spending?year=${fiscalYear}`}
                className="text-sm text-accent-red hover:text-accent-red-hover font-semibold"
              >
                View All Spending Data →
              </Link>
            </div>
          </Card>

          {/* Recent Debates from Hansard */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-text-primary">
                Recent Debates
              </h2>
              <MessageSquare className="h-6 w-6 text-accent-red" />
            </div>

            {hansardLoading ? (
              <Loading />
            ) : (
              <div className="space-y-3">
                {hansardData?.searchHansard?.slice(0, 5).map((speech: any) => (
                  <div
                    key={speech.id}
                    className="p-3 rounded-lg bg-bg-elevated border border-border-subtle hover:border-accent-red/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      {speech.madeBy ? (
                        <Link
                          href={`/mps/${speech.madeBy.id}`}
                          className="font-semibold text-text-primary hover:text-accent-red transition-colors"
                        >
                          {speech.madeBy.name}
                        </Link>
                      ) : (
                        <span className="font-semibold text-text-primary">
                          {speech.who_en}
                        </span>
                      )}
                      {speech.partOf?.date && (
                        <span className="text-sm text-text-tertiary">
                          {new Date(speech.partOf.date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {speech.h2_en && (
                      <div className="text-sm font-medium text-text-secondary mb-1">
                        {speech.h2_en}
                      </div>
                    )}
                    <div className="text-sm text-text-secondary line-clamp-2">
                      {speech.content_en}
                    </div>
                    {speech.madeBy && (
                      <div className="text-xs text-text-tertiary mt-1">
                        {speech.madeBy.party}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-border-subtle">
              <Link
                href="/hansard"
                className="text-sm text-accent-red hover:text-accent-red-hover font-semibold"
              >
                Search Hansard Records →
              </Link>
            </div>
          </Card>
        </div>

        {/* Information Banner */}
        <Card className="mt-8 bg-bg-overlay border-accent-red/20">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-accent-red/10 rounded-lg">
              <Info className="h-6 w-6 text-accent-red" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-text-primary mb-2">
                About This Dashboard
              </h3>
              <p className="text-sm text-text-secondary">
                This dashboard provides real-time insights into Canadian federal government operations.
                Data is sourced from official government databases including Parliament, LEGISinfo,
                and the Office of the Commissioner of Lobbying. Expense data typically reflects
                information 2-3 months after quarter end.
              </p>
            </div>
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
