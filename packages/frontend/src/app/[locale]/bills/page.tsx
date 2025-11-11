/**
 * Bills list page
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
import { SEARCH_BILLS } from '@/lib/queries';
import { Link } from '@/i18n/navigation';
import { Search, Filter, XCircle, Crown, FileText, Users } from 'lucide-react';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { getBilingualContent } from '@/hooks/useBilingual';
import { ShareButton } from '@/components/ShareButton';
import { BookmarkButton } from '@/components/bookmarks/BookmarkButton';
import { PartyLogo } from '@/components/PartyLogo';
import { PrintableCard } from '@/components/PrintableCard';
import { BillGanttWidget } from '@/components/bills/BillGanttWidget';

export default function BillsPage() {
  const t = useTranslations('bills');
  const locale = useLocale();
  const dateLocale = locale === 'fr' ? fr : enUS;
  const CURRENT_SESSION = '45-1'; // 45th Parliament, 1st Session

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sessionFilter, setSessionFilter] = useState<string>(CURRENT_SESSION); // Default to current session
  const [billTypeFilter, setBillTypeFilter] = useState<string>('');
  const [chamberFilter, setChamberFilter] = useState<string>('');
  const [royalAssentOnly, setRoyalAssentOnly] = useState<boolean>(false); // Default OFF
  const [orderPaperOnly, setOrderPaperOnly] = useState<boolean>(true); // Default ON - shows active bills
  const [failedLegislationOnly, setFailedLegislationOnly] = useState<boolean>(false); // Default OFF
  const [privateMembersBillsOnly, setPrivateMembersBillsOnly] = useState<boolean>(false); // Default OFF

  // Handle order paper toggle
  const handleOrderPaperToggle = (checked: boolean) => {
    setOrderPaperOnly(checked);
    if (checked) {
      // Order Paper is always current session
      setSessionFilter(CURRENT_SESSION);
      // Turn off Failed Legislation when Order Paper is on
      setFailedLegislationOnly(false);
    } else {
      setSessionFilter('');
    }
  };

  // Handle royal assent toggle - ADDITIVE (doesn't affect other filters)
  const handleRoyalAssentToggle = (checked: boolean) => {
    setRoyalAssentOnly(checked);
    if (checked) {
      // Get all sessions for royal assent bills
      setSessionFilter('');
    } else {
      // Restore session filter based on Order Paper
      if (orderPaperOnly) {
        setSessionFilter(CURRENT_SESSION);
      }
    }
  };

  // Handle failed legislation toggle
  const handleFailedLegislationToggle = (checked: boolean) => {
    setFailedLegislationOnly(checked);
    if (checked) {
      // Failed legislation shows previous sessions only
      setOrderPaperOnly(false);
      setSessionFilter(''); // Get all sessions
    } else {
      // Restore to Order Paper default
      setOrderPaperOnly(true);
      setSessionFilter(CURRENT_SESSION);
    }
  };

  const { data, loading, error} = useQuery(SEARCH_BILLS, {
    variables: {
      searchTerm: searchTerm || null,
      status: statusFilter || null,
      session: sessionFilter || null,
      bill_type: billTypeFilter || null,
      originating_chamber: chamberFilter || null,
      limit: 100,
    },
  });

  // Define stage order (higher number = later stage, appears first)
  const getStageOrder = (status: string | null | undefined): number => {
    const statusStr = (status || '').toLowerCase();
    if (statusStr.includes('royal assent')) return 7;
    if (statusStr.includes('passed')) return 6;
    if (statusStr.includes('third reading')) return 5;
    if (statusStr.includes('second reading')) return 4;
    if (statusStr.includes('committee')) return 3;
    if (statusStr.includes('first reading')) return 2;
    return 1; // Unknown/other statuses
  };

  const statuses = ['Royal assent received', 'Awaiting royal assent', 'At third reading in the Senate', 'At second reading in the Senate', 'At second reading in the House of Commons', 'At consideration in committee in the House of Commons', 'At consideration in committee in the Senate', 'At report stage in the House of Commons'];
  const sessions = ['45-1', '44-1', '43-2', '43-1', '42-1', '41-2', '41-1'];
  const billTypes = ['Government Bill', 'Private Member\'s Bill', 'Senate Government Bill', 'Senate Public Bill'];
  const chambers = ['House of Commons', 'Senate'];

  // Helper to translate bill type
  const translateBillType = (type: string) => {
    if (type === 'Government Bill') return t('types.government');
    if (type === 'Private Member\'s Bill') return t('types.private');
    if (type === 'Senate Government Bill' || type === 'Senate Public Bill') return t('types.senate');
    return type;
  };

  // Helper to translate chamber
  const translateChamber = (chamber: string) => {
    if (chamber === 'House of Commons') return t('chambers.commons');
    if (chamber === 'Senate') return t('chambers.senate');
    return chamber;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 page-container">
        {/* GANTT Widget - Order Paper Legislative Progress */}
        <BillGanttWidget currentSession={CURRENT_SESSION} />

        {/* Search All Legislation Section */}
        <div id="search-legislation" className="scroll-mt-20">
          <h2 className="text-2xl font-bold text-text-primary mb-4 mt-16">{t('search.title')}</h2>

          {/* Filters */}
          <div className="mb-6 space-y-4">
            {/* Search */}
            <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
            <input
              type="text"
              placeholder={t('search.placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border-subtle rounded-lg text-text-primary placeholder-text-tertiary focus:border-accent-red focus:outline-none transition-colors"
            />
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap gap-3">
            {/* Session filter */}
            <select
              value={sessionFilter}
              onChange={(e) => {
                const newSession = e.target.value;
                setSessionFilter(newSession);
              }}
              className="px-4 py-2 bg-bg-secondary border border-border-subtle rounded-lg text-text-primary focus:border-accent-red focus:outline-none transition-colors"
            >
              <option value="">{t('filters.session')}</option>
              {sessions.map((session) => (
                <option key={session} value={session}>
                  {t('filters.sessionLabel', { session })}
                </option>
              ))}
            </select>

            {/* Bill type filter */}
            <select
              value={billTypeFilter}
              onChange={(e) => setBillTypeFilter(e.target.value)}
              className="px-4 py-2 bg-bg-secondary border border-border-subtle rounded-lg text-text-primary focus:border-accent-red focus:outline-none transition-colors"
            >
              <option value="">{t('filters.type')}</option>
              {billTypes.map((type) => (
                <option key={type} value={type}>
                  {translateBillType(type)}
                </option>
              ))}
            </select>

            {/* Chamber filter */}
            <select
              value={chamberFilter}
              onChange={(e) => setChamberFilter(e.target.value)}
              className="px-4 py-2 bg-bg-secondary border border-border-subtle rounded-lg text-text-primary focus:border-accent-red focus:outline-none transition-colors"
            >
              <option value="">{t('filters.chamber')}</option>
              {chambers.map((chamber) => (
                <option key={chamber} value={chamber}>
                  {translateChamber(chamber)}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-bg-secondary border border-border-subtle rounded-lg text-text-primary focus:border-accent-red focus:outline-none transition-colors"
            >
              <option value="">{t('filters.status')}</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            {/* Order Paper filter button */}
            <button
              onClick={() => handleOrderPaperToggle(!orderPaperOnly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                orderPaperOnly
                  ? 'bg-blue-600 text-white border-2 border-blue-600'
                  : 'bg-bg-secondary text-text-primary border-2 border-border-subtle hover:border-blue-600'
              }`}
            >
              <FileText className="h-4 w-4" />
              {t('filters.orderPaper')}
            </button>

            {/* Royal Assent filter button */}
            <button
              onClick={() => handleRoyalAssentToggle(!royalAssentOnly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                royalAssentOnly
                  ? 'bg-amber-600 text-white border-2 border-amber-600'
                  : 'bg-bg-secondary text-text-primary border-2 border-border-subtle hover:border-amber-600'
              }`}
            >
              <Crown className="h-4 w-4" />
              {t('filters.royalAssent')}
            </button>

            {/* Failed Legislation filter button */}
            <button
              onClick={() => handleFailedLegislationToggle(!failedLegislationOnly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                failedLegislationOnly
                  ? 'bg-red-600 text-white border-2 border-red-600'
                  : 'bg-bg-secondary text-text-primary border-2 border-border-subtle hover:border-red-600'
              }`}
            >
              <XCircle className="h-4 w-4" />
              {t('filters.failedLegislation')}
            </button>

            {/* Private Members' Bills filter button */}
            <button
              onClick={() => setPrivateMembersBillsOnly(!privateMembersBillsOnly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                privateMembersBillsOnly
                  ? 'bg-green-600 text-white border-2 border-green-600'
                  : 'bg-bg-secondary text-text-primary border-2 border-border-subtle hover:border-green-600'
              }`}
            >
              <Users className="h-4 w-4" />
              {t('filters.privateMembersBills')}
            </button>
          </div>
          </div>
        </div>

        {/* Bills List */}
        {loading ? (
          <Loading />
        ) : error ? (
          <Card>
            <p className="text-accent-red">{t('search.error')}</p>
          </Card>
        ) : (
          <div>
            {data?.searchBills
              ?.filter((bill: any) => bill.title || bill.title_fr) // Only show bills with titles (complete data)
              .filter((bill: any) => {
                const status = (bill.status || '').toLowerCase();
                const hasRoyalAssent = status.includes('royal assent');
                const isCurrentSession = bill.session === CURRENT_SESSION;
                const isPrivateMembersBill = bill.bill_type === "Private Member's Bill";

                // Private Members' Bills toggle: if ON, only show private members' bills
                if (privateMembersBillsOnly && !isPrivateMembersBill) {
                  return false;
                }

                // Royal Assent toggle: if ON, ALWAYS include royal assent bills (additive)
                if (royalAssentOnly && hasRoyalAssent) {
                  return true;
                }

                // Order Paper toggle: if ON, include current session non-royal-assent bills
                if (orderPaperOnly && isCurrentSession && !hasRoyalAssent) {
                  return true;
                }

                // Failed Legislation toggle: if ON, include previous session bills without royal assent
                if (failedLegislationOnly && !isCurrentSession && !hasRoyalAssent) {
                  return true;
                }

                return false;
              })
              .sort((a: any, b: any) => {
                // Sort by stage (late-stage bills first)
                const aOrder = getStageOrder(a.status);
                const bOrder = getStageOrder(b.status);
                return bOrder - aOrder; // Higher order number appears first
              })
              .map((bill: any, index: number) => {
                const bilingualBill = getBilingualContent(bill, locale);

                // Share data
                const shareUrl = `/${locale}/bills/${bill.session}/${bill.number}`;
                const shareTitle = `${t('card.billLabel')} ${bill.number} - ${bilingualBill.title}`;
                const shareDescription = bilingualBill.summary
                  ? bilingualBill.summary.replace(/<[^>]*>/g, '').substring(0, 150) + (bilingualBill.summary.length > 150 ? '...' : '')
                  : bilingualBill.title;

                return (
              <Link
                key={`${bill.session}-${bill.number}-${index}`}
                href={`/bills/${bill.session}/${bill.number}` as any}
                className="block mb-8"
              >
                <PrintableCard>
                  <Card className="hover:border-accent-red transition-colors cursor-pointer relative">
                    {/* Action Buttons - Top Right */}
                    <div className="absolute top-3 right-3 z-10 flex gap-2">
                      <BookmarkButton
                        bookmarkData={{
                          itemType: 'bill',
                          itemId: `${bill.session}-${bill.number}`,
                          title: `${t('card.billLabel')} ${bill.number}`,
                          subtitle: bilingualBill.title,
                          url: `/${locale}/bills/${bill.session}/${bill.number}`,
                          metadata: {
                            session: bill.session,
                            bill_type: bilingualBill.bill_type,
                            status: bilingualBill.status,
                            sponsor: bill.sponsor?.name,
                            party: bill.sponsor?.party,
                            is_government_bill: bill.is_government_bill,
                          },
                        }}
                        size="sm"
                      />
                      <ShareButton
                        url={shareUrl}
                        title={shareTitle}
                        description={shareDescription}
                        size="sm"
                      />
                    </div>

                    <div className="flex items-start justify-between pr-8">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-xl font-semibold text-text-primary">
                          {t('card.billLabel')} {bill.number}
                        </h3>
                        <span className="text-xs text-text-tertiary">
                          {bill.session}
                        </span>
                        {bilingualBill.bill_type && (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            bill.is_government_bill
                              ? 'bg-blue-500/20 text-blue-400'
                              : bilingualBill.bill_type?.includes('Senate') || bilingualBill.bill_type?.includes('Sénat')
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-green-500/20 text-green-400'
                          }`}>
                            {bilingualBill.bill_type}
                          </span>
                        )}
                        {bilingualBill.originating_chamber && (
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-500/20 text-gray-400 font-medium">
                            {bilingualBill.originating_chamber}
                          </span>
                        )}
                        {bilingualBill.status && (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            bilingualBill.status === 'Passed' || bilingualBill.status === 'Royal Assent' || bilingualBill.status === 'Adopté' || bilingualBill.status?.includes('Sanction royale')
                              ? 'bg-green-500/20 text-green-400'
                              : bilingualBill.status?.includes('Reading') || bilingualBill.status?.includes('lecture')
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {bilingualBill.status}
                          </span>
                        )}
                      </div>
                      <p className="text-text-primary font-medium mb-2">{bilingualBill.title}</p>
                      {bilingualBill.summary && (
                        <div
                          className="text-text-secondary text-sm mb-3 line-clamp-2"
                          dangerouslySetInnerHTML={{
                            __html: bilingualBill.summary.length > 150 ? `${bilingualBill.summary.slice(0, 150)}...` : bilingualBill.summary
                          }}
                        />
                      )}
                      <div className="flex items-center gap-4 text-sm text-text-secondary flex-wrap">
                        {bill.sponsor && (
                          <div className="flex items-center gap-2">
                            {bill.sponsor.party && (
                              <PartyLogo
                                party={bill.sponsor.party}
                                size="sm"
                                linkTo={undefined}
                              />
                            )}
                            <span>
                              {t('card.sponsor')}: <span className="text-text-primary">{bill.sponsor.name}</span> ({bill.sponsor.party})
                            </span>
                          </div>
                        )}
                        {bill.introduced_date && (
                          <span>
                            {t('card.introduced')}: {format(new Date(bill.introduced_date), 'PPP', { locale: dateLocale })}
                          </span>
                        )}
                      </div>
                    </div>
                    </div>
                  </Card>
                </PrintableCard>
              </Link>
              );
            })}
          </div>
        )}

        {data?.searchBills?.length === 0 && (
          <Card>
            <p className="text-text-secondary text-center">{t('search.noResults')}</p>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
