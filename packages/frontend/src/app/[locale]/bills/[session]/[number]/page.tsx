/**
 * Individual bill detail page
 * Fully bilingual with Quebec French support
 */

'use client';

import { use, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useTranslations, useLocale } from 'next-intl';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loading } from '@/components/Loading';
import { Card } from '@canadagpt/design-system';
import { GET_BILL, GET_BILL_LOBBYING, GET_BILL_DEBATES } from '@/lib/queries';
import { Link } from '@/i18n/navigation';
import NextLink from 'next/link';
import { getMPPhotoUrl } from '@/lib/utils/mpPhotoUrl';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { FileText, Users, ThumbsUp, ThumbsDown, Building, Calendar, CheckCircle, UserCheck, MessageSquare } from 'lucide-react';
import { BillDiscussions } from '@/components/forum';
import { useBilingualContent } from '@/hooks/useBilingual';
import { usePageThreading } from '@/contexts/UserPreferencesContext';
import { ThreadToggle, ConversationThread } from '@/components/hansard';
import { ShareButton } from '@/components/ShareButton';
import { BookmarkButton } from '@/components/bookmarks/BookmarkButton';

export default function BillDetailPage({
  params,
}: {
  params: Promise<{ session: string; number: string }>;
}) {
  const resolvedParams = use(params);
  const t = useTranslations('bill');
  const locale = useLocale();
  const dateLocale = locale === 'fr' ? fr : enUS;

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

  const { data: debatesData, loading: debatesLoading } = useQuery(GET_BILL_DEBATES, {
    variables: {
      billNumber: resolvedParams.number,
      session: resolvedParams.session,
      limit: 50,
    },
  });

  // Threading state
  const { enabled: threadedViewEnabled, setEnabled: setThreadedViewEnabled } = usePageThreading();

  // Lobbying display state
  const [showAllLobbying, setShowAllLobbying] = useState(false);

  const bill = data?.bills?.[0];
  const bilingualBill = useBilingualContent(bill || {});
  const lobbying = lobbyingData?.billLobbying;
  const debates = debatesData?.billDebates || [];

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
            <p className="text-accent-red">{t('notFound')}</p>
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
        <div className="mb-8 relative">
          {/* Bookmark and Share Buttons - Top Right */}
          <div className="absolute top-0 right-0 flex gap-2">
            <BookmarkButton
              bookmarkData={{
                itemType: 'bill',
                itemId: `${bill.session}-${bill.number}`,
                title: `${t('billNumber')} ${bill.number}`,
                subtitle: bilingualBill.title,
                url: `/${locale}/bills/${bill.session}/${bill.number}`,
                metadata: {
                  session: bill.session,
                  number: bill.number,
                  status: bilingualBill.status,
                  is_government_bill: bill.is_government_bill,
                  bill_type: bilingualBill.bill_type,
                },
              }}
              size="md"
            />
            <ShareButton
              url={`/${locale}/bills/${bill.session}/${bill.number}`}
              title={`${t('billNumber')} ${bill.number} - ${bilingualBill.title}`}
              description={bilingualBill.summary || bilingualBill.title}
              size="md"
            />
          </div>

          <div className="flex items-center gap-2 mb-3 flex-wrap pr-24">
            <h1 className="text-4xl font-bold text-text-primary">{t('billNumber')} {bill.number}</h1>
            <span className="text-sm text-text-tertiary">{t('session')} {bill.session}</span>
            {bilingualBill.bill_type && (
              <span className={`text-sm px-3 py-1 rounded-full font-medium ${
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
              <span className="text-sm px-3 py-1 rounded-full bg-gray-500/20 text-gray-400 font-medium">
                {bilingualBill.originating_chamber}
              </span>
            )}
            <span className={`text-sm px-4 py-2 rounded-full font-semibold ${
              bilingualBill.status === 'Passed' || bilingualBill.status === 'Royal Assent' ||
              bilingualBill.status === 'Adopté' || bilingualBill.status === 'Sanction royale'
                ? 'bg-green-500/20 text-green-400'
                : bilingualBill.status?.includes('Reading') || bilingualBill.status?.includes('lecture')
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {bilingualBill.status}
            </span>
          </div>

          <h2 className="text-2xl text-text-secondary mb-4">{bilingualBill.title}</h2>

          {bill.statute_year && (
            <div className="mb-4 text-sm text-green-400 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              {t('enactedAs')} {bill.statute_year}{bill.statute_chapter && `, ${t('chapter')} ${bill.statute_chapter}`}
            </div>
          )}

          <div className="flex flex-wrap gap-6 text-sm text-text-secondary">
            {bill.sponsor && (
              <Link
                href={`/mps/${bill.sponsor.id}` as any}
                className="flex items-center hover:text-accent-red transition-colors"
              >
                <Users className="h-4 w-4 mr-2" />
                {t('sponsoredBy')} {bill.sponsor.name} ({bill.sponsor.party})
              </Link>
            )}
            {bill.introduced_date && (
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                {t('introduced')} {format(new Date(bill.introduced_date), 'MMMM d, yyyy', { locale: dateLocale })}
              </div>
            )}
            {bill.passed_date && (
              <div className="flex items-center text-green-400">
                <CheckCircle className="h-4 w-4 mr-2" />
                {t('passed')} {format(new Date(bill.passed_date), 'MMMM d, yyyy', { locale: dateLocale })}
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        {bilingualBill.summary && (
          <Card className="mb-6">
            <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-accent-red" />
              {t('summary')}
            </h3>
            <div
              className="text-text-secondary leading-relaxed prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: bilingualBill.summary }}
            />
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Votes */}
          <Card>
            <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center">
              <ThumbsUp className="h-5 w-5 mr-2 text-accent-red" />
              {t('votes')}
            </h3>

            {bill.votes && bill.votes.length > 0 ? (
              <div className="space-y-3">
                {bill.votes.map((vote: any) => {
                  const resultLower = vote.result?.toLowerCase() || '';
                  const isPassed = resultLower.includes('agree') || resultLower === 'y';
                  const isFailed = resultLower.includes('negative') || resultLower === 'n';
                  const resultDisplay = isPassed ? t('voteResult.passed') : isFailed ? t('voteResult.failed') : vote.result;

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
                            {format(new Date(vote.date), 'MMM d, yyyy', { locale: dateLocale })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <span className="flex items-center text-green-400">
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          {vote.yeas} {t('voteResult.yea')}
                        </span>
                        <span className="flex items-center text-red-400">
                          <ThumbsDown className="h-4 w-4 mr-1" />
                          {vote.nays} {t('voteResult.nay')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>
                {bilingualBill.status?.toLowerCase().includes('second reading') ||
                 bilingualBill.status?.toLowerCase().includes('deuxième lecture') ? (
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-blue-400" />
                      <span className="font-semibold text-text-primary">{t('awaitingSecondReading')}</span>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {t('awaitingDescription')}
                      {bill.is_private_member_bill && (
                        <span className="block mt-2">
                          {t('privateMemberNote')}
                        </span>
                      )}
                    </p>
                  </div>
                ) : (
                  <p className="text-text-secondary">{t('noVotes')}</p>
                )}
              </div>
            )}
          </Card>

          {/* Lobbying Activity */}
          <Card>
            <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center">
              <Building className="h-5 w-5 mr-2 text-accent-red" />
              {t('lobbying')}
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
                    {t('organizationsLobbying')} ({lobbying.total_lobbying_events} {t('events')})
                  </div>
                </div>

                <div className="space-y-2">
                  {(showAllLobbying ? lobbying.organizations : lobbying.organizations.slice(0, 5)).map((org: any, index: number) => (
                    <NextLink
                      key={index}
                      href={`/${locale}/organizations/${org.id || encodeURIComponent(org.name.toLowerCase().replace(/\s+/g, '-'))}`}
                      className="block p-3 rounded-lg bg-bg-elevated hover:bg-bg-elevated/80 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-accent-red hover:underline text-sm mb-1">
                            {org.name}
                          </div>
                          {org.industry && (
                            <span className="text-xs px-2 py-0.5 rounded bg-gray-500/20 text-gray-400">
                              {org.industry}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <div className="text-right">
                            <div className="text-sm font-semibold text-accent-red">
                              {org.lobbying_count} {org.lobbying_count === 1 ? 'event' : 'events'}
                            </div>
                            {org.lobbyist_count && (
                              <div className="text-xs text-text-tertiary">
                                {org.lobbyist_count} {org.lobbyist_count === 1 ? 'lobbyist' : 'lobbyists'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </NextLink>
                  ))}
                </div>

                {lobbying.organizations.length > 5 && !showAllLobbying && (
                  <button
                    onClick={() => setShowAllLobbying(true)}
                    className="mt-3 text-sm text-accent-red hover:underline"
                  >
                    {t('viewAll')} ({lobbying.organizations.length} {t('total')})
                  </button>
                )}
                {showAllLobbying && lobbying.organizations.length > 5 && (
                  <button
                    onClick={() => setShowAllLobbying(false)}
                    className="mt-3 text-sm text-accent-red hover:underline"
                  >
                    {t('showLess')}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-text-secondary">{t('noLobbying')}</p>
            )}
          </Card>

          {/* Committees */}
          {bill.referredTo && bill.referredTo.length > 0 && (
            <Card>
              <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center">
                <UserCheck className="h-5 w-5 mr-2 text-accent-red" />
                {t('committees')}
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

          {/* Parliamentary Debates */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-text-primary flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-accent-red" />
                {t('debates')}
              </h3>
              <ThreadToggle
                enabled={threadedViewEnabled}
                onChange={setThreadedViewEnabled}
                size="sm"
                showLabels={false}
              />
            </div>

            {debatesLoading ? (
              <Loading size="sm" />
            ) : debates && debates.length > 0 ? (
              threadedViewEnabled ? (
                <ConversationThread
                  statements={debates}
                  defaultExpanded={false}
                />
              ) : (
                <div className="space-y-4">
                  {debates.map((speech: any) => (
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

                      {/* Speaker */}
                      {speech.madeBy && (() => {
                        const photoUrl = getMPPhotoUrl(speech.madeBy);

                        return (
                          <div className="flex items-center gap-3 mb-3">
                            {photoUrl && (
                              <img
                                src={photoUrl}
                                alt={speech.madeBy.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            )}
                            <div>
                              <Link
                                href={`/mps/${speech.madeBy.id}` as any}
                                className="font-semibold text-text-primary hover:text-accent-red transition-colors"
                              >
                                {speech.madeBy.name}
                              </Link>
                              <div className="text-sm text-text-secondary">
                                {speech.madeBy.party}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Content */}
                      <p className="text-text-primary mb-3 whitespace-pre-line">
                        {speech.content_en}
                      </p>

                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-xs text-text-secondary">
                        {speech.time && (
                          <span>{speech.time}</span>
                        )}
                        {speech.wordcount && (
                          <span>{speech.wordcount} words</span>
                        )}
                        {speech.statement_type && (
                          <span className="px-2 py-0.5 bg-bg-overlay rounded">
                            {speech.statement_type}
                          </span>
                        )}
                        {speech.mentionsConnection?.edges?.[0]?.properties?.debate_stage && (
                          <span className="px-2 py-0.5 bg-accent-red/20 text-accent-red rounded">
                            {speech.mentionsConnection.edges[0].properties.debate_stage}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <p className="text-text-secondary">{t('noDebates')}</p>
            )}
          </Card>
        </div>

        {/* Legislative Timeline */}
        {(bill.introduced_date || bill.passed_house_first_reading || bill.passed_house_second_reading ||
          bill.passed_house_third_reading || bill.passed_senate_first_reading || bill.passed_senate_second_reading ||
          bill.passed_senate_third_reading || bill.passed_date || bill.royal_assent_date) && (
          <Card className="mt-6">
            <h3 className="text-xl font-bold text-text-primary mb-4">{t('timeline')}</h3>

            <div className="space-y-3">
              {(() => {
                // Collect all timeline events with dates
                const events = [];

                if (bill.royal_assent_date) {
                  events.push({
                    date: new Date(bill.royal_assent_date),
                    title: t('stages.royalAssent'),
                    description: t('stages.billBecameLaw'),
                    colorClass: 'text-green-400'
                  });
                }

                if (bill.passed_date) {
                  events.push({
                    date: new Date(bill.passed_date),
                    title: t('voteResult.passed'),
                    description: t('stages.billPassed'),
                    colorClass: 'text-green-400'
                  });
                }

                if (bill.passed_senate_third_reading) {
                  events.push({
                    date: new Date(bill.passed_senate_third_reading),
                    title: t('stages.senateThird'),
                    description: t('stages.passedThirdSenate'),
                    colorClass: 'text-purple-400'
                  });
                }

                if (bill.passed_senate_second_reading) {
                  events.push({
                    date: new Date(bill.passed_senate_second_reading),
                    title: t('stages.senateSecond'),
                    description: t('stages.passedSecondSenate'),
                    colorClass: 'text-purple-400'
                  });
                }

                if (bill.passed_senate_first_reading) {
                  events.push({
                    date: new Date(bill.passed_senate_first_reading),
                    title: t('stages.senateFirst'),
                    description: t('stages.passedFirstSenate'),
                    colorClass: 'text-purple-400'
                  });
                }

                if (bill.passed_house_third_reading) {
                  events.push({
                    date: new Date(bill.passed_house_third_reading),
                    title: t('stages.houseThird'),
                    description: t('stages.passedThirdHouse'),
                    colorClass: 'text-blue-400'
                  });
                }

                if (bill.passed_house_second_reading) {
                  events.push({
                    date: new Date(bill.passed_house_second_reading),
                    title: t('stages.houseSecond'),
                    description: t('stages.passedSecondHouse'),
                    colorClass: 'text-blue-400'
                  });
                }

                if (bill.passed_house_first_reading) {
                  events.push({
                    date: new Date(bill.passed_house_first_reading),
                    title: t('stages.houseFirst'),
                    description: t('stages.passedFirstHouse'),
                    colorClass: 'text-blue-400'
                  });
                }

                if (bill.introduced_date) {
                  events.push({
                    date: new Date(bill.introduced_date),
                    title: t('stages.introduced'),
                    description: t('stages.billIntroduced', { number: bill.number }),
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
                          {format(event.date, 'MMM d, yyyy', { locale: dateLocale })}
                        </div>
                        <div className="flex-1">
                          <div className={`font-semibold ${event.colorClass}`}>{event.title}</div>
                          <div className="text-sm text-text-secondary">{event.description}</div>
                        </div>
                      </div>
                    ))}
                    {bill.latest_event && (
                      <div className="flex items-start">
                        <div className="w-32 flex-shrink-0 text-sm text-text-secondary">{t('stages.current')}</div>
                        <div className="flex-1">
                          <div className="font-semibold text-text-primary">{bill.latest_event}</div>
                          <div className="text-sm text-text-secondary">{t('stages.latestStatus')}</div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </Card>
        )}

        {/* Community Discussion */}
        <Card className="mt-6">
          <BillDiscussions
            billNumber={bill.number}
            billSession={bill.session}
            billTitle={bill.title}
          />
        </Card>
      </main>

      <Footer />
    </div>
  );
}
