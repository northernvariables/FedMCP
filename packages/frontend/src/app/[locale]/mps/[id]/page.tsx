/**
 * Individual MP detail page
 */

'use client';

import React, { use, useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useLocale } from 'next-intl';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loading } from '@/components/Loading';
import { ExpenseChart } from '@/components/ExpenseChart';
import { ExpenseLineChart } from '@/components/ExpenseLineChart';
import { NewsArticles } from '@/components/NewsArticles';
import { Tabs } from '@/components/Tabs';
import { Card } from '@canadagpt/design-system';
import {
  GET_MP_BASIC_INFO,
  GET_MP_LEGISLATION,
  GET_MP_EXPENSES,
  GET_MP_VOTES,
  GET_MP_COMMITTEES,
  GET_MP_SCORECARD,
  GET_MP_NEWS,
  GET_MP_SPEECHES,
  GET_MP_LOBBY_COMMUNICATIONS
} from '@/lib/queries';
import Link from 'next/link';
import { formatCAD } from '@canadagpt/design-system';
import { getMPPhotoUrl } from '@/lib/utils/mpPhotoUrl';
import { Mail, Phone, Twitter, MapPin, Award, FileText, TrendingUp, ExternalLink, Building2, Crown, BarChart3, Newspaper, CheckCircle2, XCircle, MinusCircle, Vote, MessageSquare, Calendar, Hash, Users } from 'lucide-react';
import { PartyLogo } from '@/components/PartyLogo';
import { usePageThreading } from '@/contexts/UserPreferencesContext';
import { ThreadToggle, ConversationThread } from '@/components/hansard';
import { ShareButton } from '@/components/ShareButton';
import { BookmarkButton } from '@/components/bookmarks/BookmarkButton';

export default function MPDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const locale = useLocale();

  // Minimal initial query - just header + overview data
  const { data, loading, error } = useQuery(GET_MP_BASIC_INFO, {
    variables: { id },
  });

  const { data: scorecardData, loading: scorecardLoading } = useQuery(GET_MP_SCORECARD, {
    variables: { mpId: id },
  });

  // Lazy-loaded tab data - only fetched when tab is clicked
  const { data: legislationData, loading: legislationLoading, refetch: refetchLegislation } = useQuery(GET_MP_LEGISLATION, {
    variables: { id },
    skip: true, // Don't fetch initially
  });

  const { data: expensesData, loading: expensesLoading, refetch: refetchExpenses } = useQuery(GET_MP_EXPENSES, {
    variables: { id },
    skip: true, // Don't fetch initially
  });

  const { data: votesData, loading: votesLoading, refetch: refetchVotes } = useQuery(GET_MP_VOTES, {
    variables: { id },
    skip: true, // Don't fetch initially
  });

  const { data: committeesData, loading: committeesLoading, refetch: refetchCommittees } = useQuery(GET_MP_COMMITTEES, {
    variables: { id },
    skip: true, // Don't fetch initially
  });

  // Hardcoded global average for now (TODO: fix fetch)
  const globalAverage = 124551.79;

  const mp = data?.mps?.[0];
  const scorecard = scorecardData?.mpScorecard;

  // Merge lazy-loaded data with initial data
  const mpLegislation = legislationData?.mps?.[0];
  const mpExpenses = expensesData?.mps?.[0];
  const mpVotes = votesData?.mps?.[0];
  const mpCommittees = committeesData?.mps?.[0];

  // Track which tabs have been loaded
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['overview']));

  // Handle tab change to lazy-load data
  const handleTabChange = (tabId: string) => {
    if (loadedTabs.has(tabId)) return; // Already loaded

    switch (tabId) {
      case 'legislation':
        refetchLegislation();
        break;
      case 'expenses':
        refetchExpenses();
        break;
      case 'votes':
        refetchVotes();
        break;
      case 'committees':
        refetchCommittees();
        break;
    }

    setLoadedTabs(prev => new Set([...prev, tabId]));
  };

  const { data: newsData, loading: newsLoading } = useQuery(GET_MP_NEWS, {
    variables: { mpName: mp?.name || '', limit: 10 },
    skip: !mp?.name,
  });

  const { data: speechesData, loading: speechesLoading } = useQuery(GET_MP_SPEECHES, {
    variables: { mpId: id, limit: 20 },
  });

  const [speechFilter, setSpeechFilter] = useState<string>('all'); // 'all', 'D' (Debates), 'E' (Committee)
  const [expandedSpeeches, setExpandedSpeeches] = useState<Set<string>>(new Set());
  const [imageError, setImageError] = useState(false);

  // Lobbying pagination state
  const [lobbyingPageSize, setLobbyingPageSize] = useState(10);
  const [lobbyingOffset, setLobbyingOffset] = useState(0);

  // Lobbying data query
  const { data: lobbyingData, loading: lobbyingLoading } = useQuery(GET_MP_LOBBY_COMMUNICATIONS, {
    variables: {
      mpId: id,
      limit: lobbyingPageSize,
      offset: lobbyingOffset
    },
  });

  // Threading state
  const { enabled: threadedViewEnabled, setEnabled: setThreadedViewEnabled } = usePageThreading();

  if (loading || scorecardLoading) {
    return (
      <>
        <Header />
        <Loading />
        <Footer />
      </>
    );
  }

  if (error || !mp) {
    return (
      <>
        <Header />
        <div className="page-container">
          <Card>
            <p className="text-accent-red">MP not found</p>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  // Get photo URL from GCS or fallback to ID-based construction
  const photoUrl = getMPPhotoUrl(mp);

  // Extract lobbying data
  const lobbyCommunications = lobbyingData?.lobbyCommunications || [];
  const lobbyingTotalCount = lobbyingData?.lobbyCommunicationsAggregate?.count || 0;

  // Calculate pagination info
  const currentPage = Math.floor(lobbyingOffset / lobbyingPageSize) + 1;
  const totalPages = Math.ceil(lobbyingTotalCount / lobbyingPageSize);
  const startItem = lobbyingOffset + 1;
  const endItem = Math.min(lobbyingOffset + lobbyingPageSize, lobbyingTotalCount);

  // Pagination handlers
  const handleNextPage = () => {
    if (lobbyingOffset + lobbyingPageSize < lobbyingTotalCount) {
      setLobbyingOffset(lobbyingOffset + lobbyingPageSize);
    }
  };

  const handlePrevPage = () => {
    if (lobbyingOffset > 0) {
      setLobbyingOffset(Math.max(0, lobbyingOffset - lobbyingPageSize));
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    setLobbyingPageSize(newSize);
    setLobbyingOffset(0);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 page-container">
        {/* MP Header */}
        <div className="mb-8 relative">
          {/* Bookmark and Share Buttons - Top Right */}
          <div className="absolute top-0 right-0 flex gap-2">
            <BookmarkButton
              bookmarkData={{
                itemType: 'mp',
                itemId: id,
                title: mp.name,
                subtitle: `${mp.memberOf?.name || mp.party} - ${mp.represents?.name || mp.riding}`,
                imageUrl: photoUrl || undefined,
                url: `/${locale}/mps/${id}`,
                metadata: {
                  party: mp.memberOf?.name || mp.party,
                  riding: mp.represents?.name || mp.riding,
                  current: mp.current,
                  cabinet_position: mp.cabinet_position,
                },
              }}
              size="md"
            />
            <ShareButton
              url={`/${locale}/mps/${id}`}
              title={mp.name}
              description={`${mp.memberOf?.name || mp.party} - ${mp.represents?.name || mp.riding}`}
              size="md"
            />
          </div>

          <div className="flex items-start space-x-6 pr-24">
            {photoUrl && !imageError && (
              <img
                src={photoUrl}
                alt={mp.name}
                className="w-[165px] h-[264px] rounded-xl object-contain bg-bg-elevated"
                onError={() => setImageError(true)}
              />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-text-primary">{mp.name}</h1>
                <PartyLogo party={mp.memberOf?.name || mp.party} size="lg" linkTo="party" />
                {mp.cabinet_position && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent-red/20 text-accent-red rounded-lg text-sm font-semibold">
                    <Crown className="h-4 w-4" />
                    Cabinet
                  </div>
                )}
              </div>
              {mp.cabinet_position && (
                <p className="text-lg text-white font-medium mb-2">
                  {mp.cabinet_position}
                </p>
              )}
              <p className="text-xl text-text-secondary mb-4">
                {mp.memberOf?.name || mp.party} · {mp.represents?.name || mp.riding}{mp.represents?.province && `, ${mp.represents.province}`}
              </p>

              {/* Contact Information & Office Details */}
              <div className="space-y-3">
                {/* Main Contact Row */}
                <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                  {mp.email && (
                    <a href={`mailto:${mp.email}`} className="flex items-center hover:text-accent-red transition-colors">
                      <Mail className="h-4 w-4 mr-2" />
                      {mp.email}
                    </a>
                  )}
                  {mp.phone && (
                    <a href={`tel:${mp.phone}`} className="flex items-center hover:text-accent-red transition-colors">
                      <Phone className="h-4 w-4 mr-2" />
                      {mp.phone}
                      <span className="ml-1 text-xs text-text-tertiary">(Ottawa)</span>
                    </a>
                  )}
                  {mp.twitter && (
                    <a
                      href={`https://twitter.com/${mp.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center hover:text-accent-red transition-colors"
                    >
                      <Twitter className="h-4 w-4 mr-2" />
                      @{mp.twitter}
                    </a>
                  )}
                  {mp.wikipedia_id && (
                    <a
                      href={`https://en.wikipedia.org/?curid=${mp.wikipedia_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center hover:text-accent-red transition-colors"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Wikipedia
                    </a>
                  )}
                  {mp.ourcommons_url && (
                    <a
                      href={mp.ourcommons_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center hover:text-accent-red transition-colors"
                    >
                      <Building2 className="h-4 w-4 mr-2" />
                      OurCommons
                    </a>
                  )}
                </div>

                {/* Constituency Office(s) */}
                {mp.constituency_office && (() => {
                  // Split by double line breaks to detect multiple offices
                  const offices = mp.constituency_office
                    .split(/\n\n+/)
                    .map(office => office.trim())
                    .filter(office => office.length > 0);

                  // Parse office text to extract and format phone numbers
                  const parseOffice = (officeText: string) => {
                    const lines = officeText.split('\n');
                    const elements: React.ReactNode[] = [];

                    lines.forEach((line, idx) => {
                      // Check if line contains a phone number
                      const phoneMatch = line.match(/^Phone:\s*(.+)$/i);

                      if (phoneMatch) {
                        const phoneNumber = phoneMatch[1].trim();
                        elements.push(
                          <div key={idx} className="flex items-center gap-2">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            <a href={`tel:${phoneNumber.replace(/[^0-9+]/g, '')}`} className="hover:text-accent-red transition-colors">
                              {phoneNumber}
                            </a>
                          </div>
                        );
                      } else if (line.trim()) {
                        elements.push(<div key={idx}>{line}</div>);
                      }
                    });

                    return elements;
                  };

                  return (
                    <div className="flex flex-wrap gap-3 text-sm">
                      {offices.map((office, index) => (
                        <div key={index} className="flex items-start gap-2 flex-1 min-w-[250px]">
                          <MapPin className="h-4 w-4 mt-0.5 text-accent-red flex-shrink-0" />
                          <div className="text-text-secondary leading-relaxed space-y-0.5">
                            {parseOffice(office)}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs for organized content */}
        <Tabs
          defaultTab="overview"
          onTabChange={handleTabChange}
          tabs={[
            {
              id: 'overview',
              label: 'Overview',
              content: (
                <>
                  {/* Performance Scorecard */}
                  {scorecard && (
                    <Card className="mb-6">
                      <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
                        <Award className="h-6 w-6 mr-2 text-accent-red" />
                        Performance Scorecard
                      </h2>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                          <div className="text-3xl font-bold text-accent-red">{scorecard.bills_sponsored}</div>
                          <div className="text-sm text-text-secondary">Bills Sponsored</div>
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-accent-red">{scorecard.bills_passed}</div>
                          <div className="text-sm text-text-secondary">Bills Passed</div>
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-accent-red">
                            {scorecard.legislative_effectiveness.toFixed(1)}%
                          </div>
                          <div className="text-sm text-text-secondary">Legislative Effectiveness</div>
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-accent-red">
                            {formatCAD(scorecard.current_year_expenses, { compact: true })}
                          </div>
                          <div className="text-sm text-text-secondary">Current Year Expenses</div>
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-accent-red">{scorecard.question_period_interjections}</div>
                          <div className="text-sm text-text-secondary">Question Period Interjections</div>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Recent Votes */}
                  {mp.votedConnection?.edges && mp.votedConnection.edges.length > 0 && (
                    <Card className="mb-6">
                      <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
                        <Vote className="h-6 w-6 mr-2 text-accent-red" />
                        Recent Votes
                      </h2>
                      <div className="space-y-3">
                        {mp.votedConnection.edges.slice(0, 5).map((edge: any) => {
                          const vote = edge.node;
                          const mpVote = edge.properties?.position; // How the MP voted

                          let voteIcon, voteColor, voteLabel;
                          const voteNormalized = mpVote?.toLowerCase();
                          if (voteNormalized === 'yes' || voteNormalized === 'yea') {
                            voteIcon = <CheckCircle2 className="h-5 w-5" />;
                            voteColor = 'text-green-400';
                            voteLabel = 'Yea';
                          } else if (voteNormalized === 'no' || voteNormalized === 'nay') {
                            voteIcon = <XCircle className="h-5 w-5" />;
                            voteColor = 'text-red-400';
                            voteLabel = 'Nay';
                          } else {
                            voteIcon = <MinusCircle className="h-5 w-5" />;
                            voteColor = 'text-gray-400';
                            voteLabel = mpVote || 'Abstain';
                          }

                          const voteResultLabel = vote.result === 'Y' ? 'Motion Passed' : vote.result === 'N' ? 'Motion Failed' : 'Unknown Result';
                          const voteResultColor = vote.result === 'Y' ? 'text-green-400' : 'text-red-400';

                          return (
                            <div
                              key={vote.id}
                              className="p-3 rounded-lg bg-bg-elevated hover:bg-bg-elevated/80 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className={`font-semibold flex items-center gap-2 ${voteColor}`}>
                                    {voteIcon}
                                    {voteLabel}
                                  </div>
                                  <span className="text-sm text-text-secondary">
                                    {new Date(vote.date).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className={`text-xs font-medium ${voteResultColor}`}>
                                  {voteResultLabel}
                                </div>
                              </div>
                              {vote.subjectOf && (
                                <p className="text-sm text-text-primary mb-1">
                                  <span className="font-semibold">{vote.subjectOf.number}:</span> {vote.subjectOf.title}
                                </p>
                              )}
                              {vote.description && (
                                <p className="text-sm text-text-secondary mb-1 italic">
                                  {vote.description}
                                </p>
                              )}
                              <div className="flex gap-4 text-xs text-text-secondary">
                                <span>Yeas: {vote.yeas}</span>
                                <span>Nays: {vote.nays}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  )}

                  {/* Recent Speeches */}
                  {speechesData?.mpSpeeches && speechesData.mpSpeeches.length > 0 && (
                    <Card>
                      <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
                        <MessageSquare className="h-6 w-6 mr-2 text-accent-red" />
                        Recent Speeches
                      </h2>
                      <div className="space-y-4">
                        {speechesData.mpSpeeches.slice(0, 3).map((speech: any) => (
                          <div
                            key={speech.id}
                            className="p-4 rounded-lg bg-bg-elevated hover:bg-bg-elevated/80 transition-colors"
                          >
                            {/* Topic Headers */}
                            {speech.h2_en && (
                              <div className="mb-2">
                                {speech.h1_en && (
                                  <div className="text-xs font-semibold text-accent-red uppercase">
                                    {speech.h1_en}
                                  </div>
                                )}
                                <div className="font-bold text-text-primary">
                                  {speech.h2_en}
                                </div>
                                {speech.h3_en && (
                                  <div className="text-sm text-text-secondary">
                                    {speech.h3_en}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Content Preview */}
                            <p className="text-text-primary mb-2 line-clamp-3">
                              {speech.content_en}
                            </p>

                            {/* Metadata */}
                            <div className="flex items-center gap-4 text-xs text-text-secondary">
                              {speech.partOf?.date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(speech.partOf.date).toLocaleDateString()}
                                </span>
                              )}
                              {speech.wordcount && (
                                <span className="flex items-center gap-1">
                                  <Hash className="h-3 w-3" />
                                  {speech.wordcount} words
                                </span>
                              )}
                              {speech.partOf?.document_type && (
                                <span className="px-2 py-0.5 bg-bg-overlay rounded text-text-tertiary">
                                  {speech.partOf.document_type === 'D' ? 'Debate' : 'Committee'}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-4 border-t border-border-subtle">
                        <button
                          onClick={() => {
                            const speechesTab = document.querySelector('[data-tab-id="speeches"]');
                            if (speechesTab instanceof HTMLElement) {
                              speechesTab.click();
                            }
                          }}
                          className="text-sm text-accent-red hover:text-accent-red-hover font-semibold"
                        >
                          View All Speeches →
                        </button>
                      </div>
                    </Card>
                  )}
                </>
              ),
            },
            {
              id: 'legislation',
              label: 'Legislation',
              content: (
                <Card>
                  <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
                    <FileText className="h-6 w-6 mr-2 text-accent-red" />
                    Sponsored Bills
                  </h2>

                  {legislationLoading ? (
                    <Loading />
                  ) : mpLegislation?.sponsored && mpLegislation.sponsored.length > 0 ? (
                    <div className="space-y-3">
                      {mpLegislation.sponsored.map((bill: any) => (
                        <Link
                          key={`${bill.number}-${bill.session}`}
                          href={`/bills/${bill.session}/${bill.number}`}
                          className="block p-3 rounded-lg hover:bg-bg-elevated transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-text-primary">{bill.number}</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              bill.status === 'Passed'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {bill.status}
                            </span>
                          </div>
                          <p className="text-sm text-text-secondary line-clamp-2">{bill.title}</p>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-text-secondary">No sponsored bills found.</p>
                  )}
                </Card>
              ),
            },
            {
              id: 'expenses',
              label: 'Expenses',
              content: expensesLoading ? (
                <Card><Loading /></Card>
              ) : (
                <>
                  {/* Expense Trend Line Chart */}
                  {mpExpenses?.expenses && mpExpenses.expenses.length > 0 && (
                    <Card className="mb-6">
                      <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
                        <TrendingUp className="h-6 w-6 mr-2 text-accent-red" />
                        Spending Trend Over Time
                      </h2>
                      <ExpenseLineChart expenses={mpExpenses.expenses} />
                    </Card>
                  )}

                  {/* Expense Breakdown by Category */}
                  {mpExpenses?.expenses && mpExpenses.expenses.length > 0 && (
                    <Card className="mb-6">
                      <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
                        <BarChart3 className="h-6 w-6 mr-2 text-accent-red" />
                        Quarterly Breakdown by Category
                      </h2>
                      <ExpenseChart expenses={mpExpenses.expenses} globalAverage={globalAverage} />
                    </Card>
                  )}

                  {/* Recent Expenses */}
                  <Card>
                    <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
                      <TrendingUp className="h-6 w-6 mr-2 text-accent-red" />
                      Detailed Expenses
                    </h2>

                    {mpExpenses?.expenses && mpExpenses.expenses.length > 0 ? (
                      <div className="space-y-3">
                        {mpExpenses.expenses.map((expense: any) => (
                          <div
                            key={expense.id}
                            className="p-3 rounded-lg bg-bg-elevated hover:bg-bg-elevated/80 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="font-semibold text-text-primary">
                                    FY {expense.fiscal_year} Q{expense.quarter}
                                  </div>
                                  {expense.category && (() => {
                                    // Explicit class names for Tailwind JIT - case insensitive matching
                                    let badgeClasses = 'bg-gray-500/20 text-gray-400';
                                    const categoryLower = expense.category.toLowerCase();
                                    if (categoryLower === 'salaries') badgeClasses = 'bg-blue-500/20 text-blue-400';
                                    else if (categoryLower === 'travel') badgeClasses = 'bg-green-500/20 text-green-400';
                                    else if (categoryLower === 'hospitality') badgeClasses = 'bg-yellow-500/20 text-yellow-400';
                                    else if (categoryLower === 'office') badgeClasses = 'bg-purple-500/20 text-purple-400';
                                    else if (categoryLower === 'contracts') badgeClasses = 'bg-red-500/20 text-red-400';

                                    return (
                                      <span className={`text-xs px-2 py-1 rounded ${badgeClasses}`}>
                                        {expense.category}
                                      </span>
                                    );
                                  })()}
                                </div>
                                {expense.description && (
                                  <p className="text-sm text-text-secondary line-clamp-1">
                                    {expense.description}
                                  </p>
                                )}
                              </div>
                              <div className="text-lg font-semibold text-text-primary ml-4">
                                {formatCAD(expense.amount)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-text-secondary">No expense data available.</p>
                    )}
                  </Card>
                </>
              ),
            },
            {
              id: 'votes',
              label: 'Voting Record',
              content: (
                <Card>
                  <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
                    <Vote className="h-6 w-6 mr-2 text-accent-red" />
                    Voting Record
                  </h2>

                  {votesLoading ? (
                    <Loading />
                  ) : mpVotes?.votedConnection?.edges && mpVotes.votedConnection.edges.length > 0 ? (
                    <div className="space-y-3">
                      {mpVotes.votedConnection.edges.map((edge: any) => {
                        const vote = edge.node;
                        const mpVote = edge.properties?.position; // How the MP voted

                        // Determine vote icon and color based on MP's position
                        let voteIcon, voteColor, voteLabel;
                        const voteNormalized = mpVote?.toLowerCase();
                        if (voteNormalized === 'yes' || voteNormalized === 'yea') {
                          voteIcon = <CheckCircle2 className="h-5 w-5" />;
                          voteColor = 'text-green-400';
                          voteLabel = 'Yea';
                        } else if (voteNormalized === 'no' || voteNormalized === 'nay') {
                          voteIcon = <XCircle className="h-5 w-5" />;
                          voteColor = 'text-red-400';
                          voteLabel = 'Nay';
                        } else {
                          voteIcon = <MinusCircle className="h-5 w-5" />;
                          voteColor = 'text-gray-400';
                          voteLabel = mpVote || 'Abstain';
                        }

                        const voteResultLabel = vote.result === 'Y' ? 'Motion Passed' : vote.result === 'N' ? 'Motion Failed' : 'Unknown Result';
                        const voteResultColor = vote.result === 'Y' ? 'text-green-400' : 'text-red-400';

                        return (
                          <div
                            key={vote.id}
                            className="p-4 rounded-lg bg-bg-elevated hover:bg-bg-elevated/80 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-3">
                                    <div className={`font-semibold flex items-center gap-2 ${voteColor}`}>
                                      {voteIcon}
                                      {voteLabel}
                                    </div>
                                    <span className="text-sm text-text-secondary">
                                      Vote #{vote.number}
                                    </span>
                                    <span className="text-sm text-text-secondary">
                                      {new Date(vote.date).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className={`text-xs font-medium ${voteResultColor}`}>
                                    {voteResultLabel}
                                  </div>
                                </div>
                                {vote.subjectOf && (
                                  <p className="text-sm text-text-primary mb-2">
                                    <span className="font-semibold">{vote.subjectOf.number}:</span> {vote.subjectOf.title}
                                  </p>
                                )}
                                {vote.description && (
                                  <p className="text-sm text-text-secondary mb-2 italic">
                                    {vote.description}
                                  </p>
                                )}
                                <div className="flex gap-4 text-xs text-text-secondary">
                                  <span>Yeas: {vote.yeas}</span>
                                  <span>Nays: {vote.nays}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-text-secondary">No voting record available.</p>
                  )}
                </Card>
              ),
            },
            {
              id: 'news',
              label: 'News',
              content: (
                <Card>
                  <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
                    <Newspaper className="h-6 w-6 mr-2 text-accent-red" />
                    Recent News
                  </h2>
                  <NewsArticles articles={newsData?.mpNews || []} loading={newsLoading} />
                </Card>
              ),
            },
            {
              id: 'speeches',
              label: 'Speeches',
              content: (
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-text-primary flex items-center">
                      <MessageSquare className="h-6 w-6 mr-2 text-accent-red" />
                      Parliamentary Speeches
                    </h2>
                    {/* Filter and View Toggles */}
                    <div className="flex gap-3">
                      <ThreadToggle
                        enabled={threadedViewEnabled}
                        onChange={setThreadedViewEnabled}
                        size="sm"
                        showLabels={false}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSpeechFilter('all')}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            speechFilter === 'all'
                              ? 'bg-accent-red text-white'
                              : 'bg-bg-elevated text-text-secondary hover:bg-bg-overlay'
                          }`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setSpeechFilter('D')}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            speechFilter === 'D'
                              ? 'bg-accent-red text-white'
                              : 'bg-bg-elevated text-text-secondary hover:bg-bg-overlay'
                          }`}
                        >
                          Debates
                        </button>
                        <button
                          onClick={() => setSpeechFilter('E')}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            speechFilter === 'E'
                              ? 'bg-accent-red text-white'
                              : 'bg-bg-elevated text-text-secondary hover:bg-bg-overlay'
                          }`}
                        >
                          Committee
                        </button>
                      </div>
                    </div>
                  </div>

                  {speechesLoading ? (
                    <Loading />
                  ) : speechesData?.mpSpeeches && speechesData.mpSpeeches.length > 0 ? (
                    (() => {
                      // Filter speeches based on document type
                      const filteredSpeeches = speechesData.mpSpeeches.filter((speech: any) =>
                        speechFilter === 'all' || speech.partOf?.document_type === speechFilter
                      );

                      // Render threaded or linear view
                      return threadedViewEnabled ? (
                        <ConversationThread
                          statements={filteredSpeeches}
                          defaultExpanded={false}
                        />
                      ) : (
                        <div className="space-y-4">
                          {filteredSpeeches.map((speech: any) => {
                          const isExpanded = expandedSpeeches.has(speech.id);
                          const content = speech.content_en || '';
                          const preview = content.length > 400 ? content.substring(0, 400) + '...' : content;

                          return (
                            <div
                              key={speech.id}
                              className="p-4 rounded-lg bg-bg-elevated border border-border-subtle hover:border-accent-red/30 transition-colors"
                            >
                              {/* Topic Headers */}
                              {(speech.h1_en || speech.h2_en || speech.h3_en) && (
                                <div className="mb-3 pb-3 border-b border-border-subtle">
                                  {speech.h1_en && (
                                    <div className="text-xs font-semibold text-accent-red uppercase mb-1">
                                      {speech.h1_en}
                                    </div>
                                  )}
                                  {speech.h2_en && (
                                    <div className="font-bold text-lg text-text-primary">
                                      {speech.h2_en}
                                    </div>
                                  )}
                                  {speech.h3_en && (
                                    <div className="text-sm text-text-secondary mt-1">
                                      {speech.h3_en}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Content */}
                              <p className="text-text-primary mb-3 whitespace-pre-line">
                                {isExpanded ? content : preview}
                              </p>

                              {/* Expand/Collapse */}
                              {content.length > 400 && (
                                <button
                                  onClick={() => {
                                    const newExpanded = new Set(expandedSpeeches);
                                    if (isExpanded) {
                                      newExpanded.delete(speech.id);
                                    } else {
                                      newExpanded.add(speech.id);
                                    }
                                    setExpandedSpeeches(newExpanded);
                                  }}
                                  className="text-sm text-accent-red hover:text-accent-red-hover font-medium mb-3"
                                >
                                  {isExpanded ? 'Show less' : 'Read more'}
                                </button>
                              )}

                              {/* Metadata */}
                              <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
                                <div className="flex items-center gap-4 text-xs text-text-secondary">
                                  {speech.partOf?.date && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {new Date(speech.partOf.date).toLocaleDateString('en-CA', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                      })}
                                    </span>
                                  )}
                                  {speech.wordcount && (
                                    <span className="flex items-center gap-1">
                                      <Hash className="h-3 w-3" />
                                      {speech.wordcount} words
                                    </span>
                                  )}
                                  {speech.partOf?.document_type && (
                                    <span className="px-2 py-0.5 bg-bg-overlay rounded">
                                      {speech.partOf.document_type === 'D' ? 'Debate' : 'Committee'}
                                    </span>
                                  )}
                                  {speech.statement_type && (
                                    <span className="px-2 py-0.5 bg-bg-overlay rounded">
                                      {speech.statement_type}
                                    </span>
                                  )}
                                </div>

                                {/* Link to Full Debate */}
                                {speech.partOf?.id && (
                                  <Link
                                    href={`/debates/${speech.partOf.id}`}
                                    className="text-sm text-accent-red hover:text-accent-red-hover font-medium flex items-center gap-1"
                                  >
                                    View Full Debate
                                    <ExternalLink className="h-3 w-3" />
                                  </Link>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        </div>
                      );
                    })()
                  ) : (
                    <p className="text-text-secondary">No speeches found.</p>
                  )}
                </Card>
              ),
            },
            {
              id: 'committees',
              label: 'Committees',
              content: (
                <Card>
                  <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
                    <Building2 className="h-6 w-6 mr-2 text-accent-red" />
                    Committee Memberships
                  </h2>

                  {committeesLoading ? (
                    <Loading />
                  ) : mpCommittees?.servedOnConnection?.edges && mpCommittees.servedOnConnection.edges.length > 0 ? (
                    <div className="space-y-3">
                      {mpCommittees.servedOnConnection.edges.map((edge: any) => {
                        const committee = edge.node;
                        const role = edge.properties?.role || 'Member';

                        // Determine role badge color
                        let roleBadgeClass = 'bg-gray-500/20 text-gray-400';
                        if (role === 'Chair') roleBadgeClass = 'bg-accent-red/20 text-accent-red';
                        else if (role === 'Vice-Chair' || role === 'Co-Chair') roleBadgeClass = 'bg-yellow-500/20 text-yellow-400';

                        return (
                          <Link
                            key={committee.code}
                            href={`/committees/${committee.code}`}
                            className="block p-4 rounded-lg bg-bg-elevated hover:bg-bg-elevated/80 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                  <h3 className="font-semibold text-text-primary">{committee.code}</h3>
                                  <span className={`text-xs px-2 py-1 rounded font-medium ${roleBadgeClass}`}>
                                    {role}
                                  </span>
                                  {committee.chamber && (
                                    <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400">
                                      {committee.chamber}
                                    </span>
                                  )}
                                </div>
                                {committee.name && (
                                  <p className="text-sm text-text-primary mb-1">{committee.name}</p>
                                )}
                                {committee.mandate && (
                                  <p className="text-sm text-text-secondary line-clamp-2">{committee.mandate}</p>
                                )}
                              </div>
                              <ExternalLink className="h-4 w-4 text-text-secondary ml-4 mt-1" />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-text-secondary">No committee memberships found.</p>
                  )}
                </Card>
              ),
            },
            {
              id: 'lobbying',
              label: 'Lobbying Meetings',
              content: (
                <Card>
                  <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
                    <Users className="h-6 w-6 mr-2 text-accent-red" />
                    Lobbying Meetings
                  </h2>

                  {lobbyingTotalCount > 0 ? (
                    <>
                      {/* Summary Stats */}
                      <div className="grid grid-cols-3 gap-4 mb-6 p-4 rounded-lg bg-bg-elevated">
                        <div>
                          <div className="text-2xl font-bold text-accent-red">
                            {lobbyingTotalCount}
                          </div>
                          <div className="text-sm text-text-secondary">Total Communications</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-accent-red">
                            {lobbyCommunications.length > 0 ? new Set(lobbyCommunications.map((c: any) => c.lobbyist?.id).filter(Boolean)).size : 0}
                          </div>
                          <div className="text-sm text-text-secondary">Unique Lobbyists (This Page)</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-accent-red">
                            {lobbyCommunications.length > 0 ? new Set(lobbyCommunications.map((c: any) => c.organization?.id).filter(Boolean)).size : 0}
                          </div>
                          <div className="text-sm text-text-secondary">Organizations (This Page)</div>
                        </div>
                      </div>

                      {lobbyingLoading ? (
                        <div className="text-center py-8 text-text-secondary">Loading meetings...</div>
                      ) : (
                        <>
                          {/* Meetings List */}
                          <div className="space-y-3">
                            {lobbyCommunications.map((communication: any, index: number) => {
                          const lobbyist = communication.lobbyist;
                          const organization = communication.organization;

                          return (
                            <div
                              key={`${communication.id}-${index}`}
                              className="p-4 rounded-lg bg-bg-elevated hover:bg-bg-elevated/80 transition-colors"
                            >
                              {/* Date */}
                              <div className="flex items-center gap-3 mb-3">
                                <Calendar className="h-4 w-4 text-text-secondary flex-shrink-0" />
                                <div className="text-sm text-text-primary font-semibold">
                                  {communication.date ? new Date(communication.date).toLocaleDateString() : 'Date unknown'}
                                </div>
                              </div>

                              <div className="space-y-2">
                                {/* Lobbyist */}
                                {lobbyist && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-sm text-text-secondary min-w-[90px] flex-shrink-0">Lobbyist:</span>
                                    <div className="flex-1">
                                      <Link
                                        href={`/${locale}/lobbyists/${lobbyist.id}`}
                                        className="text-sm font-medium text-accent-red hover:underline"
                                      >
                                        {lobbyist.name}
                                      </Link>
                                      {lobbyist.firm && (
                                        <span className="text-sm text-text-tertiary ml-2">({lobbyist.firm})</span>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Organization */}
                                {organization && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-sm text-text-secondary min-w-[90px] flex-shrink-0">Organization:</span>
                                    <div className="flex-1">
                                      <Link
                                        href={`/${locale}/organizations/${organization.id}`}
                                        className="text-sm font-medium text-accent-red hover:underline"
                                      >
                                        {organization.name}
                                      </Link>
                                      {organization.industry && (
                                        <span className="text-xs px-2 py-0.5 ml-2 rounded bg-gray-500/20 text-gray-400">
                                          {organization.industry}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Government Officials Contacted */}
                                {communication.dpoh_names && communication.dpoh_names.length > 0 && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-sm text-text-secondary min-w-[90px] flex-shrink-0">Officials:</span>
                                    <div className="flex-1">
                                      <div className="text-sm text-text-primary">
                                        {communication.dpoh_names.slice(0, 3).join(', ')}
                                        {communication.dpoh_names.length > 3 && (
                                          <span className="text-text-tertiary"> +{communication.dpoh_names.length - 3} more</span>
                                        )}
                                      </div>
                                      {communication.dpoh_titles && communication.dpoh_titles.length > 0 && (
                                        <div className="text-xs text-text-tertiary mt-1">
                                          {communication.dpoh_titles.slice(0, 2).join(', ')}
                                          {communication.dpoh_titles.length > 2 && ` +${communication.dpoh_titles.length - 2} more`}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Subject Matters */}
                                {communication.subject_matters && communication.subject_matters.length > 0 && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-sm text-text-secondary min-w-[90px] flex-shrink-0">Topics:</span>
                                    <div className="flex-1 flex flex-wrap gap-1">
                                      {communication.subject_matters.slice(0, 3).map((subject: string, i: number) => (
                                        <span key={i} className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                                          {subject}
                                        </span>
                                      ))}
                                      {communication.subject_matters.length > 3 && (
                                        <span className="text-xs px-2 py-0.5 rounded bg-gray-500/20 text-gray-400">
                                          +{communication.subject_matters.length - 3} more
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Institutions */}
                                {communication.institutions && communication.institutions.length > 0 && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-sm text-text-secondary min-w-[90px] flex-shrink-0">Institutions:</span>
                                    <div className="flex-1">
                                      <div className="text-sm text-text-tertiary">
                                        {communication.institutions.slice(0, 2).join(', ')}
                                        {communication.institutions.length > 2 && ` +${communication.institutions.length - 2} more`}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                            })}
                          </div>

                          {/* Pagination Controls */}
                          <div className="mt-6 border-t border-border pt-4">
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                              {/* Showing X of Y */}
                              <div className="text-sm text-text-secondary">
                                Showing {startItem} to {endItem} of {lobbyingTotalCount} communications
                              </div>

                              {/* Page size selector */}
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-text-secondary">Per page:</span>
                                <select
                                  value={lobbyingPageSize}
                                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                                  className="px-3 py-1 rounded bg-bg-elevated border border-border text-text-primary text-sm"
                                >
                                  <option value={10}>10</option>
                                  <option value={25}>25</option>
                                  <option value={50}>50</option>
                                </select>
                              </div>

                              {/* Navigation buttons */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={handlePrevPage}
                                  disabled={lobbyingOffset === 0}
                                  className="px-4 py-2 rounded bg-bg-elevated border border-border text-text-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-elevated/80 transition-colors"
                                >
                                  Previous
                                </button>
                                <span className="text-sm text-text-secondary">
                                  Page {currentPage} of {totalPages}
                                </span>
                                <button
                                  onClick={handleNextPage}
                                  disabled={lobbyingOffset + lobbyingPageSize >= lobbyingTotalCount}
                                  className="px-4 py-2 rounded bg-bg-elevated border border-border text-text-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-elevated/80 transition-colors"
                                >
                                  Next
                                </button>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <p className="text-text-secondary">No lobbying meetings recorded.</p>
                  )}
                </Card>
              ),
            },
          ]}
        />
      </main>

      <Footer />
    </div>
  );
}
