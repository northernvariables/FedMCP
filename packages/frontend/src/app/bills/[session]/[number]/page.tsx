/**
 * Individual bill detail page
 */

'use client';

import { use } from 'react';
import { useQuery } from '@apollo/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loading } from '@/components/Loading';
import { Card } from '@canadagpt/design-system';
import { GET_BILL, GET_BILL_LOBBYING } from '@/lib/queries';
import Link from 'next/link';
import { format } from 'date-fns';
import { FileText, Users, ThumbsUp, ThumbsDown, Building, Calendar, CheckCircle, UserCheck } from 'lucide-react';

export default function BillDetailPage({
  params,
}: {
  params: Promise<{ session: string; number: string }>;
}) {
  const resolvedParams = use(params);

  const { data, loading, error } = useQuery(GET_BILL, {
    variables: {
      number: resolvedParams.number,
      session: resolvedParams.session,
    },
  });

  const { data: lobbyingData, loading: lobbyingLoading } = useQuery(GET_BILL_LOBBYING, {
    variables: {
      billNumber: resolvedParams.number,
      session: resolvedParams.session,
    },
  });

  const bill = data?.bills?.[0];
  const lobbying = lobbyingData?.billLobbying;

  if (loading) {
    return (
      <>
        <Header />
        <Loading />
        <Footer />
      </>
    );
  }

  if (error || !bill) {
    return (
      <>
        <Header />
        <div className="page-container">
          <Card>
            <p className="text-accent-red">Bill not found</p>
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
        {/* Bill Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <h1 className="text-4xl font-bold text-text-primary">Bill {bill.number}</h1>
            <span className="text-sm text-text-tertiary">Session {bill.session}</span>
            {bill.bill_type && (
              <span className={`text-sm px-3 py-1 rounded-full font-medium ${
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
              <span className="text-sm px-3 py-1 rounded-full bg-gray-500/20 text-gray-400 font-medium">
                {bill.originating_chamber}
              </span>
            )}
            <span className={`text-sm px-4 py-2 rounded-full font-semibold ${
              bill.status === 'Passed' || bill.status === 'Royal Assent'
                ? 'bg-green-500/20 text-green-400'
                : bill.status?.includes('Reading')
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {bill.status}
            </span>
          </div>

          <h2 className="text-2xl text-text-secondary mb-4">{bill.title}</h2>

          {bill.statute_year && (
            <div className="mb-4 text-sm text-green-400 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              Enacted as law: {bill.statute_year}{bill.statute_chapter && `, Chapter ${bill.statute_chapter}`}
            </div>
          )}

          <div className="flex flex-wrap gap-6 text-sm text-text-secondary">
            {bill.sponsor && (
              <Link
                href={`/mps/${bill.sponsor.id}`}
                className="flex items-center hover:text-accent-red transition-colors"
              >
                <Users className="h-4 w-4 mr-2" />
                Sponsored by: {bill.sponsor.name} ({bill.sponsor.party})
              </Link>
            )}
            {bill.introduced_date && (
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Introduced: {format(new Date(bill.introduced_date), 'MMMM d, yyyy')}
              </div>
            )}
            {bill.passed_date && (
              <div className="flex items-center text-green-400">
                <CheckCircle className="h-4 w-4 mr-2" />
                Passed: {format(new Date(bill.passed_date), 'MMMM d, yyyy')}
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        {bill.summary && (
          <Card className="mb-6">
            <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-accent-red" />
              Summary
            </h3>
            <div
              className="text-text-secondary leading-relaxed prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: bill.summary }}
            />
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Votes */}
          <Card>
            <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center">
              <ThumbsUp className="h-5 w-5 mr-2 text-accent-red" />
              Recent Votes
            </h3>

            {bill.votes && bill.votes.length > 0 ? (
              <div className="space-y-3">
                {bill.votes.map((vote: any) => {
                  const resultLower = vote.result?.toLowerCase() || '';
                  const isPassed = resultLower.includes('agree') || resultLower === 'y';
                  const isFailed = resultLower.includes('negative') || resultLower === 'n';
                  const resultDisplay = isPassed ? 'Passed' : isFailed ? 'Failed' : vote.result;

                  return (
                    <div key={vote.id} className="p-3 rounded-lg bg-bg-elevated">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-text-primary">
                          {vote.description || vote.result}
                        </span>
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            isPassed
                              ? 'bg-green-500/20 text-green-400'
                              : isFailed
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {resultDisplay}
                          </span>
                          <span className="text-sm text-text-secondary whitespace-nowrap">
                            {format(new Date(vote.date), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <span className="flex items-center text-green-400">
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          {vote.yeas} Yea
                        </span>
                        <span className="flex items-center text-red-400">
                          <ThumbsDown className="h-4 w-4 mr-1" />
                          {vote.nays} Nay
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>
                {bill.status?.toLowerCase().includes('second reading') ? (
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-blue-400" />
                      <span className="font-semibold text-text-primary">Awaiting Second Reading</span>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      No votes have occurred yet. This bill is scheduled for second reading debate.
                      {bill.is_private_member_bill && (
                        <span className="block mt-2">
                          As a Private Member's Bill, it is waiting in the Order of Precedence queue
                          for its turn to be debated and voted on.
                        </span>
                      )}
                    </p>
                  </div>
                ) : (
                  <p className="text-text-secondary">No votes recorded yet.</p>
                )}
              </div>
            )}
          </Card>

          {/* Lobbying Activity */}
          <Card>
            <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center">
              <Building className="h-5 w-5 mr-2 text-accent-red" />
              Lobbying Activity
            </h3>

            {lobbyingLoading ? (
              <Loading size="sm" />
            ) : lobbying?.organizations_lobbying > 0 ? (
              <div>
                <div className="mb-4">
                  <div className="text-3xl font-bold text-accent-red mb-1">
                    {lobbying.organizations_lobbying}
                  </div>
                  <div className="text-sm text-text-secondary">
                    Organizations lobbying ({lobbying.total_lobbying_events} events)
                  </div>
                </div>

                <div className="space-y-2">
                  {lobbying.organizations.slice(0, 5).map((org: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded bg-bg-secondary"
                    >
                      <div>
                        <div className="font-semibold text-text-primary text-sm">{org.name}</div>
                        {org.industry && (
                          <div className="text-xs text-text-tertiary">{org.industry}</div>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-accent-red">
                        {org.lobbying_count}x
                      </div>
                    </div>
                  ))}
                </div>

                {lobbying.organizations.length > 5 && (
                  <p className="text-xs text-text-tertiary mt-3">
                    + {lobbying.organizations.length - 5} more organizations
                  </p>
                )}
              </div>
            ) : (
              <p className="text-text-secondary">No lobbying activity recorded.</p>
            )}
          </Card>

          {/* Committees */}
          {bill.referredTo && bill.referredTo.length > 0 && (
            <Card>
              <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center">
                <UserCheck className="h-5 w-5 mr-2 text-accent-red" />
                Committee Referrals
              </h3>

              <div className="space-y-2">
                {bill.referredTo.map((committee: any, index: number) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg bg-bg-elevated"
                  >
                    <div className="font-semibold text-text-primary">{committee.name}</div>
                    {committee.code && (
                      <div className="text-sm text-text-tertiary mt-1">{committee.code}</div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Legislative Timeline */}
        {(bill.introduced_date || bill.passed_house_first_reading || bill.passed_house_second_reading ||
          bill.passed_house_third_reading || bill.passed_senate_first_reading || bill.passed_senate_second_reading ||
          bill.passed_senate_third_reading || bill.passed_date || bill.royal_assent_date) && (
          <Card className="mt-6">
            <h3 className="text-xl font-bold text-text-primary mb-4">Legislative Timeline</h3>

            <div className="space-y-3">
              {(() => {
                // Collect all timeline events with dates
                const events = [];

                if (bill.royal_assent_date) {
                  events.push({
                    date: new Date(bill.royal_assent_date),
                    title: 'Royal Assent',
                    description: 'Bill became law',
                    colorClass: 'text-green-400'
                  });
                }

                if (bill.passed_date) {
                  events.push({
                    date: new Date(bill.passed_date),
                    title: 'Passed',
                    description: 'Bill passed both chambers',
                    colorClass: 'text-green-400'
                  });
                }

                if (bill.passed_senate_third_reading) {
                  events.push({
                    date: new Date(bill.passed_senate_third_reading),
                    title: 'Senate - Third Reading',
                    description: 'Passed third reading in the Senate',
                    colorClass: 'text-purple-400'
                  });
                }

                if (bill.passed_senate_second_reading) {
                  events.push({
                    date: new Date(bill.passed_senate_second_reading),
                    title: 'Senate - Second Reading',
                    description: 'Passed second reading in the Senate',
                    colorClass: 'text-purple-400'
                  });
                }

                if (bill.passed_senate_first_reading) {
                  events.push({
                    date: new Date(bill.passed_senate_first_reading),
                    title: 'Senate - First Reading',
                    description: 'Passed first reading in the Senate',
                    colorClass: 'text-purple-400'
                  });
                }

                if (bill.passed_house_third_reading) {
                  events.push({
                    date: new Date(bill.passed_house_third_reading),
                    title: 'House - Third Reading',
                    description: 'Passed third reading in the House of Commons',
                    colorClass: 'text-blue-400'
                  });
                }

                if (bill.passed_house_second_reading) {
                  events.push({
                    date: new Date(bill.passed_house_second_reading),
                    title: 'House - Second Reading',
                    description: 'Passed second reading in the House of Commons',
                    colorClass: 'text-blue-400'
                  });
                }

                if (bill.passed_house_first_reading) {
                  events.push({
                    date: new Date(bill.passed_house_first_reading),
                    title: 'House - First Reading',
                    description: 'Passed first reading in the House of Commons',
                    colorClass: 'text-blue-400'
                  });
                }

                if (bill.introduced_date) {
                  events.push({
                    date: new Date(bill.introduced_date),
                    title: 'Introduced',
                    description: `Bill ${bill.number} was introduced`,
                    colorClass: 'text-text-primary'
                  });
                }

                // Sort by date descending (newest first)
                events.sort((a, b) => b.date.getTime() - a.date.getTime());

                return (
                  <>
                    {events.map((event, index) => (
                      <div key={index} className="flex items-start">
                        <div className="w-32 flex-shrink-0 text-sm text-text-secondary">
                          {format(event.date, 'MMM d, yyyy')}
                        </div>
                        <div className="flex-1">
                          <div className={`font-semibold ${event.colorClass}`}>{event.title}</div>
                          <div className="text-sm text-text-secondary">{event.description}</div>
                        </div>
                      </div>
                    ))}
                    {bill.latest_event && (
                      <div className="flex items-start">
                        <div className="w-32 flex-shrink-0 text-sm text-text-secondary">Current</div>
                        <div className="flex-1">
                          <div className="font-semibold text-text-primary">{bill.latest_event}</div>
                          <div className="text-sm text-text-secondary">Latest status</div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
