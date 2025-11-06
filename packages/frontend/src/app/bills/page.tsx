/**
 * Bills list page
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loading } from '@/components/Loading';
import { Card } from '@canadagpt/design-system';
import { SEARCH_BILLS } from '@/lib/queries';
import Link from 'next/link';
import { Search, Filter, XCircle, Crown, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function BillsPage() {
  const CURRENT_SESSION = '45-1'; // 45th Parliament, 1st Session

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sessionFilter, setSessionFilter] = useState<string>(CURRENT_SESSION); // Default to current session
  const [billTypeFilter, setBillTypeFilter] = useState<string>('');
  const [chamberFilter, setChamberFilter] = useState<string>('');
  const [royalAssentOnly, setRoyalAssentOnly] = useState<boolean>(false); // Default OFF
  const [orderPaperOnly, setOrderPaperOnly] = useState<boolean>(true); // Default ON - shows active bills
  const [failedLegislationOnly, setFailedLegislationOnly] = useState<boolean>(false); // Default OFF

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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 page-container">
        <h1 className="text-4xl font-bold text-text-primary mb-2">Bills & Legislation</h1>
        <p className="text-text-secondary mb-8">Track federal bills through Parliament</p>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search by title, number, or keywords..."
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
                // Update toggle if current session is selected/deselected
                setCurrentSessionOnly(newSession === CURRENT_SESSION);
              }}
              className="px-4 py-2 bg-bg-secondary border border-border-subtle rounded-lg text-text-primary focus:border-accent-red focus:outline-none transition-colors"
            >
              <option value="">All Sessions</option>
              {sessions.map((session) => (
                <option key={session} value={session}>
                  Session {session}
                </option>
              ))}
            </select>

            {/* Bill type filter */}
            <select
              value={billTypeFilter}
              onChange={(e) => setBillTypeFilter(e.target.value)}
              className="px-4 py-2 bg-bg-secondary border border-border-subtle rounded-lg text-text-primary focus:border-accent-red focus:outline-none transition-colors"
            >
              <option value="">All Bill Types</option>
              {billTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            {/* Chamber filter */}
            <select
              value={chamberFilter}
              onChange={(e) => setChamberFilter(e.target.value)}
              className="px-4 py-2 bg-bg-secondary border border-border-subtle rounded-lg text-text-primary focus:border-accent-red focus:outline-none transition-colors"
            >
              <option value="">All Chambers</option>
              {chambers.map((chamber) => (
                <option key={chamber} value={chamber}>
                  {chamber}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-bg-secondary border border-border-subtle rounded-lg text-text-primary focus:border-accent-red focus:outline-none transition-colors"
            >
              <option value="">All Statuses</option>
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
              Order Paper
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
              Royal Assent
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
              Failed Legislation
            </button>
          </div>
        </div>

        {/* Bills List */}
        {loading ? (
          <Loading />
        ) : error ? (
          <Card>
            <p className="text-accent-red">Error loading bills: {error.message}</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {data?.searchBills
              ?.filter((bill: any) => bill.title) // Only show bills with titles (complete data)
              .filter((bill: any) => {
                const status = (bill.status || '').toLowerCase();
                const hasRoyalAssent = status.includes('royal assent');
                const isCurrentSession = bill.session === CURRENT_SESSION;

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
              .map((bill: any, index: number) => (
              <Link
                key={`${bill.session}-${bill.number}-${index}`}
                href={`/bills/${bill.session}/${bill.number}`}
              >
                <Card className="hover:border-accent-red transition-colors cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-xl font-semibold text-text-primary">
                          Bill {bill.number}
                        </h3>
                        <span className="text-xs text-text-tertiary">
                          {bill.session}
                        </span>
                        {bill.bill_type && (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            bill.is_government_bill
                              ? 'bg-blue-500/20 text-blue-400'
                              : bill.bill_type?.includes('Senate')
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-green-500/20 text-green-400'
                          }`}>
                            {bill.bill_type}
                          </span>
                        )}
                        {bill.originating_chamber && (
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-500/20 text-gray-400 font-medium">
                            {bill.originating_chamber}
                          </span>
                        )}
                        {bill.status && (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            bill.status === 'Passed' || bill.status === 'Royal Assent'
                              ? 'bg-green-500/20 text-green-400'
                              : bill.status?.includes('Reading')
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {bill.status}
                          </span>
                        )}
                      </div>
                      <p className="text-text-primary font-medium mb-2">{bill.title}</p>
                      {bill.summary && (
                        <div
                          className="text-text-secondary text-sm mb-3 line-clamp-2"
                          dangerouslySetInnerHTML={{
                            __html: bill.summary.length > 150 ? `${bill.summary.slice(0, 150)}...` : bill.summary
                          }}
                        />
                      )}
                      <div className="flex items-center gap-4 text-sm text-text-secondary">
                        {bill.sponsor && (
                          <span>
                            Sponsored by: <span className="text-text-primary">{bill.sponsor.name}</span> ({bill.sponsor.party})
                          </span>
                        )}
                        {bill.introduced_date && (
                          <span>
                            Introduced: {format(new Date(bill.introduced_date), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {data?.searchBills?.length === 0 && (
          <Card>
            <p className="text-text-secondary text-center">No bills found matching your criteria.</p>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
