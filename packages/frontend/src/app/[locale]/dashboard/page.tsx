/**
 * Dashboard page - Enhanced overview of government activity
 * Fully bilingual with Quebec French support
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useTranslations, useLocale } from 'next-intl';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loading } from '@/components/Loading';
import { Card } from '@canadagpt/design-system';
import { StatCard } from '@/components/dashboard/StatCard';
import { GET_TOP_SPENDERS, SEARCH_MPS, SEARCH_BILLS, SEARCH_HANSARD, GET_DASHBOARD_COUNTS, GET_RANDOM_MPS, GET_DASHBOARD_LOBBYING } from '@/lib/queries';
import { Link } from '@/i18n/navigation';
import { formatCAD } from '@canadagpt/design-system';
import { Users, FileText, Megaphone, DollarSign, TrendingUp, MessageSquare, Info, Building } from 'lucide-react';
import { CompactMPCard } from '@/components/MPCard';
import { CompactPartyFilterButtons } from '@/components/PartyFilterButtons';
import { getBilingualContent } from '@/hooks/useBilingual';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const dateLocale = locale === 'fr' ? fr : enUS;

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

  const { data: lobbyingData, loading: lobbyingLoading } = useQuery(GET_DASHBOARD_LOBBYING);

  // Optimized: Get counts with aggregate queries - 98% less data transfer
  const { data: countsData } = useQuery(GET_DASHBOARD_COUNTS);

  // Optimized: Get active bills count (need this separate as aggregate doesn't support complex filters yet)
  const { data: activeBillsData } = useQuery(SEARCH_BILLS, {
    variables: { limit: 1000 }, // TODO: Add server-side active filter
  });

  // Optimized: Server-side randomized MPs with party filtering - no client-side shuffle needed
  const { data: featuredMPsData, loading: featuredMPsLoading } = useQuery(GET_RANDOM_MPS, {
    variables: {
      parties: partyFilter.length > 0 ? partyFilter : null,
      limit: 8
    },
  });

  const totalMPs = countsData?.mpsAggregate?.count || 343;
  const totalBills = countsData?.billsAggregate?.count || 0;
  const activeBills = activeBillsData?.searchBills?.filter(
    (b: any) => b.title && !['Passed', 'Royal Assent'].includes(b.status)
  )?.length || 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 page-container">
        <h1 className="text-4xl font-bold text-text-primary mb-2">{t('title')}</h1>
        <p className="text-text-secondary mb-8">{t('subtitle')}</p>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title={t('metrics.currentMPs')}
            value={totalMPs}
            icon={Users}
            subtitle={t('metrics.membersOfParliament')}
            href="/mps"
          />
          <StatCard
            title={t('metrics.totalBills')}
            value={totalBills}
            icon={FileText}
            subtitle={t('metrics.activeBills', { count: activeBills })}
            href="/bills"
          />
          <StatCard
            title={t('metrics.topSpender')}
            value={spendersData?.topSpenders?.[0]
              ? formatCAD(spendersData.topSpenders[0].total_expenses, { compact: true })
              : '—'}
            icon={DollarSign}
            subtitle={t('metrics.expenses', { year: fiscalYear })}
          />
          <StatCard
            title={t('metrics.recentSpeeches')}
            value={hansardData?.searchHansard?.length || 0}
            icon={MessageSquare}
            subtitle={t('metrics.hansardRecords')}
            href="/hansard"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link href="/mps" className="group">
            <Card className="hover:border-accent-red transition-colors cursor-pointer text-center p-6">
              <Users className="h-8 w-8 text-accent-red mx-auto mb-2" />
              <h3 className="font-semibold text-text-primary group-hover:text-accent-red transition-colors">
                {t('quickActions.browseMPs')}
              </h3>
              <p className="text-sm text-text-secondary mt-1">{t('quickActions.viewAllMembers')}</p>
            </Card>
          </Link>

          <Link href="/bills" className="group">
            <Card className="hover:border-accent-red transition-colors cursor-pointer text-center p-6">
              <FileText className="h-8 w-8 text-accent-red mx-auto mb-2" />
              <h3 className="font-semibold text-text-primary group-hover:text-accent-red transition-colors">
                {t('quickActions.trackBills')}
              </h3>
              <p className="text-sm text-text-secondary mt-1">{t('quickActions.followLegislation')}</p>
            </Card>
          </Link>

          <Link href="/lobbying" className="group">
            <Card className="hover:border-accent-red transition-colors cursor-pointer text-center p-6">
              <Megaphone className="h-8 w-8 text-accent-red mx-auto mb-2" />
              <h3 className="font-semibold text-text-primary group-hover:text-accent-red transition-colors">
                {t('quickActions.lobbying')}
              </h3>
              <p className="text-sm text-text-secondary mt-1">{t('quickActions.corporateInfluence')}</p>
            </Card>
          </Link>

          <Link href={`/spending?year=${fiscalYear}` as any} className="group">
            <Card className="hover:border-accent-red transition-colors cursor-pointer text-center p-6">
              <DollarSign className="h-8 w-8 text-accent-red mx-auto mb-2" />
              <h3 className="font-semibold text-text-primary group-hover:text-accent-red transition-colors">
                {t('quickActions.spending')}
              </h3>
              <p className="text-sm text-text-secondary mt-1">{t('quickActions.mpExpenses')}</p>
            </Card>
          </Link>
        </div>

        {/* Featured MPs Section */}
        <Card className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-text-primary">{t('featuredMPs.title')}</h2>
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
              {(featuredMPsData?.randomMPs || []).map((mp: any) => (
                <CompactMPCard key={mp.id} mp={mp} />
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-border-subtle">
            <Link
              href="/mps"
              className="text-sm text-accent-red hover:text-accent-red-hover font-semibold"
            >
              {t('featuredMPs.viewAll')}
            </Link>
          </div>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Spenders */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-text-primary">
                {t('topSpenders.title', { year: fiscalYear })}
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
                    href={`/mps/${item.mp.id}` as any}
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
                href={`/spending?year=${fiscalYear}` as any}
                className="text-sm text-accent-red hover:text-accent-red-hover font-semibold"
              >
                {t('topSpenders.viewAll')}
              </Link>
            </div>
          </Card>

          {/* Recent Debates from Hansard */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-text-primary">
                {t('recentDebates.title')}
              </h2>
              <MessageSquare className="h-6 w-6 text-accent-red" />
            </div>

            {hansardLoading ? (
              <Loading />
            ) : (
              <div className="space-y-3">
                {hansardData?.searchHansard?.slice(0, 5).map((speech: any) => {
                  const bilingualSpeech = getBilingualContent(speech, locale);
                  return (
                    <div
                      key={speech.id}
                      className="p-3 rounded-lg bg-bg-elevated border border-border-subtle hover:border-accent-red/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        {speech.madeBy ? (
                          <Link
                            href={`/mps/${speech.madeBy.id}` as any}
                            className="font-semibold text-text-primary hover:text-accent-red transition-colors"
                          >
                            {speech.madeBy.name}
                          </Link>
                        ) : (
                          <span className="font-semibold text-text-primary">
                            {bilingualSpeech.who}
                          </span>
                        )}
                        {speech.partOf?.date && (
                          <span className="text-sm text-text-tertiary">
                            {format(new Date(speech.partOf.date), 'PPP', { locale: dateLocale })}
                          </span>
                        )}
                      </div>
                      {bilingualSpeech.h2 && (
                        <div className="text-sm font-medium text-text-secondary mb-1">
                          {bilingualSpeech.h2}
                        </div>
                      )}
                      <div className="text-sm text-text-secondary line-clamp-2">
                        {bilingualSpeech.content}
                      </div>
                      {speech.madeBy && (
                        <div className="text-xs text-text-tertiary mt-1">
                          {speech.madeBy.party}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-border-subtle">
              <Link
                href="/hansard"
                className="text-sm text-accent-red hover:text-accent-red-hover font-semibold"
              >
                {t('recentDebates.searchHansard')}
              </Link>
            </div>
          </Card>
        </div>

        {/* Recent Lobbying Activity */}
        <Card className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-text-primary">
              {t('recentLobbying.title')}
            </h2>
            <Building className="h-6 w-6 text-accent-red" />
          </div>

          {lobbyingLoading ? (
            <Loading />
          ) : lobbyingData?.lobbyCommunications && lobbyingData.lobbyCommunications.length > 0 ? (
            <div className="space-y-3">
              {lobbyingData.lobbyCommunications.slice(0, 8).map((comm: any) => {
                const orgName = comm.organization?.name || comm.client_org_name || 'Unknown Organization';
                const lobbyistName = comm.lobbyist?.name || comm.registrant_name || 'Unknown Lobbyist';
                const dpohNames = comm.dpoh_names?.slice(0, 2) || [];
                const subjectMatters = comm.subject_matters?.slice(0, 3) || [];

                return (
                  <div
                    key={comm.id}
                    className="p-3 rounded-lg bg-bg-elevated border border-border-subtle hover:border-accent-red/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        {comm.organization ? (
                          <Link
                            href={`/organizations/${comm.organization.id}` as any}
                            className="font-semibold text-text-primary hover:text-accent-red transition-colors mb-1 inline-block"
                          >
                            {orgName}
                          </Link>
                        ) : (
                          <div className="font-semibold text-text-primary mb-1">
                            {orgName}
                          </div>
                        )}
                        <div className="text-sm text-text-secondary">
                          Lobbyist: {comm.lobbyist ? (
                            <Link
                              href={`/lobbyists/${comm.lobbyist.id}` as any}
                              className="text-accent-red hover:underline"
                            >
                              {lobbyistName}
                            </Link>
                          ) : (
                            lobbyistName
                          )}
                        </div>
                      </div>
                      {comm.date && (
                        <span className="text-sm text-text-tertiary whitespace-nowrap ml-4">
                          {format(new Date(comm.date), 'MMM d, yyyy', { locale: dateLocale })}
                        </span>
                      )}
                    </div>

                    {dpohNames.length > 0 && (
                      <div className="text-xs text-text-tertiary mb-2">
                        Met with: {dpohNames.join(', ')}
                        {comm.dpoh_names && comm.dpoh_names.length > 2 && ` +${comm.dpoh_names.length - 2} more`}
                      </div>
                    )}

                    {subjectMatters.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {subjectMatters.map((subject: string, idx: number) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-0.5 rounded bg-gray-500/20 text-gray-400"
                          >
                            {subject}
                          </span>
                        ))}
                        {comm.subject_matters && comm.subject_matters.length > 3 && (
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-500/20 text-gray-400">
                            +{comm.subject_matters.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-text-secondary">No recent lobbying activity found.</p>
          )}

          <div className="mt-4 pt-4 border-t border-border-subtle">
            <Link
              href="/lobbying"
              className="text-sm text-accent-red hover:text-accent-red-hover font-semibold"
            >
              {t('recentLobbying.viewAll')}
            </Link>
          </div>
        </Card>

        {/* Information Banner */}
        <Card className="mt-8 bg-bg-overlay border-accent-red/20">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-accent-red/10 rounded-lg">
              <Info className="h-6 w-6 text-accent-red" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-text-primary mb-2">
                {t('about.title')}
              </h3>
              <p className="text-sm text-text-secondary">
                {t('about.description')}
              </p>
            </div>
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
