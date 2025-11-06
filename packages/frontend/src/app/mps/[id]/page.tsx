/**
 * Individual MP detail page
 */

'use client';

import { use, useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loading } from '@/components/Loading';
import { ExpenseChart } from '@/components/ExpenseChart';
import { ExpenseLineChart } from '@/components/ExpenseLineChart';
import { NewsArticles } from '@/components/NewsArticles';
import { Tabs } from '@/components/Tabs';
import { Card } from '@canadagpt/design-system';
import { GET_MP, GET_MP_SCORECARD, GET_MP_NEWS, GET_MP_SPEECHES } from '@/lib/queries';
import Link from 'next/link';
import { formatCAD } from '@canadagpt/design-system';
import { Mail, Phone, Twitter, MapPin, Award, FileText, TrendingUp, ExternalLink, Building2, Crown, BarChart3, Newspaper, CheckCircle2, XCircle, MinusCircle, Vote, MessageSquare, Calendar, Hash } from 'lucide-react';
import { PartyLogo } from '@/components/PartyLogo';

export default function MPDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data, loading, error } = useQuery(GET_MP, {
    variables: { id },
  });

  const { data: scorecardData, loading: scorecardLoading } = useQuery(GET_MP_SCORECARD, {
    variables: { mpId: id },
  });

  // Hardcoded global average for now (TODO: fix fetch)
  const globalAverage = 124551.79;

  const mp = data?.mps?.[0];
  const scorecard = scorecardData?.mpScorecard;

  const { data: newsData, loading: newsLoading } = useQuery(GET_MP_NEWS, {
    variables: { mpName: mp?.name || '', limit: 10 },
    skip: !mp?.name,
  });

  const { data: speechesData, loading: speechesLoading } = useQuery(GET_MP_SPEECHES, {
    variables: { mpId: id, limit: 20 },
  });

  const [speechFilter, setSpeechFilter] = useState<string>('all'); // 'all', 'D' (Debates), 'E' (Committee)
  const [expandedSpeeches, setExpandedSpeeches] = useState<Set<string>>(new Set());

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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 page-container">
        {/* MP Header */}
        <div className="mb-8">
          <div className="flex items-start space-x-6">
            {mp.photo_url && (
              <img
                src={mp.photo_url}
                alt={mp.name}
                className="w-[120px] h-48 rounded-xl object-contain bg-bg-elevated"
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

              <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                {mp.email && (
                  <a href={`mailto:${mp.email}`} className="flex items-center hover:text-accent-red transition-colors">
                    <Mail className="h-4 w-4 mr-2" />
                    {mp.email}
                  </a>
                )}
                {mp.phone && (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    {mp.phone}
                  </div>
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
                    OurCommons Profile
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs for organized content */}
        <Tabs
          defaultTab="overview"
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

                  {/* Constituency Office */}
                  {mp.constituency_office && (
                    <Card>
                      <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
                        <MapPin className="h-6 w-6 mr-2 text-accent-red" />
                        Constituency Office
                      </h2>
                      <div className="text-text-secondary whitespace-pre-line">
                        {mp.constituency_office}
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

                  {mp.sponsored && mp.sponsored.length > 0 ? (
                    <div className="space-y-3">
                      {mp.sponsored.map((bill: any) => (
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
              content: (
                <>
                  {/* Expense Trend Line Chart */}
                  {mp.expenses && mp.expenses.length > 0 && (
                    <Card className="mb-6">
                      <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
                        <TrendingUp className="h-6 w-6 mr-2 text-accent-red" />
                        Spending Trend Over Time
                      </h2>
                      <ExpenseLineChart expenses={mp.expenses} />
                    </Card>
                  )}

                  {/* Expense Breakdown by Category */}
                  {mp.expenses && mp.expenses.length > 0 && (
                    <Card className="mb-6">
                      <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
                        <BarChart3 className="h-6 w-6 mr-2 text-accent-red" />
                        Quarterly Breakdown by Category
                      </h2>
                      <ExpenseChart expenses={mp.expenses} globalAverage={globalAverage} />
                    </Card>
                  )}

                  {/* Recent Expenses */}
                  <Card>
                    <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
                      <TrendingUp className="h-6 w-6 mr-2 text-accent-red" />
                      Detailed Expenses
                    </h2>

                    {mp.expenses && mp.expenses.length > 0 ? (
                      <div className="space-y-3">
                        {mp.expenses.map((expense: any) => (
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

                  {mp.votedConnection?.edges && mp.votedConnection.edges.length > 0 ? (
                    <div className="space-y-3">
                      {mp.votedConnection.edges.map((edge: any) => {
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
                    {/* Filter Toggle */}
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

                  {speechesLoading ? (
                    <Loading />
                  ) : speechesData?.mpSpeeches && speechesData.mpSpeeches.length > 0 ? (
                    <div className="space-y-4">
                      {speechesData.mpSpeeches
                        .filter((speech: any) =>
                          speechFilter === 'all' || speech.partOf?.document_type === speechFilter
                        )
                        .map((speech: any) => {
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

                  {mp.servedOnConnection?.edges && mp.servedOnConnection.edges.length > 0 ? (
                    <div className="space-y-3">
                      {mp.servedOnConnection.edges.map((edge: any) => {
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
          ]}
        />
      </main>

      <Footer />
    </div>
  );
}
