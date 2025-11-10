/**
 * Individual Committee detail page
 */

'use client';

import { use } from 'react';
import { useQuery } from '@apollo/client';
import { useLocale } from 'next-intl';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loading } from '@/components/Loading';
import { Card } from '@canadagpt/design-system';
import { GET_COMMITTEE, GET_COMMITTEE_MEETINGS, GET_COMMITTEE_TESTIMONY, GET_COMMITTEE_ACTIVITY_METRICS } from '@/lib/queries';
import Link from 'next/link';
import { Users, FileText, Building2, Calendar, MessageSquare, ExternalLink, TrendingUp, BarChart3 } from 'lucide-react';
import { PartyLogo } from '@/components/PartyLogo';
import { ShareButton } from '@/components/ShareButton';
import { Tabs } from '@/components/Tabs';
import { getMPPhotoUrl } from '@/lib/utils/mpPhotoUrl';

export default function CommitteeDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const locale = useLocale();

  const { data, loading, error } = useQuery(GET_COMMITTEE, {
    variables: { code },
  });

  const { data: meetingsData, loading: meetingsLoading } = useQuery(GET_COMMITTEE_MEETINGS, {
    variables: { code },
  });

  const { data: testimonyData, loading: testimonyLoading } = useQuery(GET_COMMITTEE_TESTIMONY, {
    variables: { committeeCode: code, limit: 20 },
  });

  // Temporarily disabled due to Cypher query issues
  // const { data: metricsData, loading: metricsLoading } = useQuery(GET_COMMITTEE_ACTIVITY_METRICS, {
  //   variables: { committeeCode: code },
  // });

  const committee = data?.committees?.[0];
  const meetings = meetingsData?.committees?.[0]?.meetings || [];
  const testimony = testimonyData?.committeeTestimony || [];
  const metrics = null; // metricsData?.committeeActivityMetrics;

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
        <div className="mb-8 relative">
          {/* Share Button - Top Right */}
          <div className="absolute top-0 right-0">
            <ShareButton
              url={`/${locale}/committees/${committee.code}`}
              title={`${committee.name} - ${committee.code}`}
              description={committee.mandate || `${committee.chamber} Committee`}
              size="md"
            />
          </div>

          <div className="pr-12">
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
                  {/* Activity Metrics Dashboard */}
                  {metrics && !metricsLoading && (
                    <Card className="mb-6">
                      <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
                        <TrendingUp className="h-6 w-6 mr-2 text-accent-red" />
                        Committee Activity
                      </h2>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Total Meetings */}
                        <div className="p-4 rounded-lg bg-bg-elevated border border-border">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-5 w-5 text-blue-400" />
                            <span className="text-sm text-text-secondary">Total Meetings</span>
                          </div>
                          <p className="text-3xl font-bold text-text-primary">{metrics.total_meetings}</p>
                        </div>

                        {/* Recent Meetings (30 days) */}
                        <div className="p-4 rounded-lg bg-bg-elevated border border-border">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-5 w-5 text-green-400" />
                            <span className="text-sm text-text-secondary">Last 30 Days</span>
                          </div>
                          <p className="text-3xl font-bold text-text-primary">{metrics.meetings_last_30_days}</p>
                          <p className="text-xs text-text-secondary mt-1">meetings</p>
                        </div>

                        {/* Active Bills */}
                        <div className="p-4 rounded-lg bg-bg-elevated border border-border">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-5 w-5 text-yellow-400" />
                            <span className="text-sm text-text-secondary">Active Bills</span>
                          </div>
                          <p className="text-3xl font-bold text-text-primary">{metrics.active_bills_count}</p>
                        </div>

                        {/* Members */}
                        <div className="p-4 rounded-lg bg-bg-elevated border border-border">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="h-5 w-5 text-purple-400" />
                            <span className="text-sm text-text-secondary">Members</span>
                          </div>
                          <p className="text-3xl font-bold text-text-primary">{metrics.member_count}</p>
                        </div>

                        {/* Evidence Documents */}
                        <div className="p-4 rounded-lg bg-bg-elevated border border-border">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="h-5 w-5 text-orange-400" />
                            <span className="text-sm text-text-secondary">Evidence Docs</span>
                          </div>
                          <p className="text-3xl font-bold text-text-primary">{metrics.total_evidence_documents}</p>
                        </div>

                        {/* 90-day Activity */}
                        <div className="p-4 rounded-lg bg-bg-elevated border border-border">
                          <div className="flex items-center gap-2 mb-2">
                            <BarChart3 className="h-5 w-5 text-cyan-400" />
                            <span className="text-sm text-text-secondary">Last 90 Days</span>
                          </div>
                          <p className="text-3xl font-bold text-text-primary">{metrics.meetings_last_90_days}</p>
                          <p className="text-xs text-text-secondary mt-1">meetings</p>
                        </div>

                        {/* Avg Statements */}
                        <div className="p-4 rounded-lg bg-bg-elevated border border-border col-span-2">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="h-5 w-5 text-pink-400" />
                            <span className="text-sm text-text-secondary">Avg Statements Per Meeting</span>
                          </div>
                          <p className="text-3xl font-bold text-text-primary">{metrics.avg_statements_per_meeting.toFixed(1)}</p>
                        </div>
                      </div>
                    </Card>
                  )}

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
          const MemberCard = ({ member, large = false }: { member: any; large?: boolean }) => {
            // Get photo URL from GCS or fallback to ID-based construction
            const photoUrl = getMPPhotoUrl(member);
            const [imageError, setImageError] = React.useState(false);

            return (
              <Link
                href={`/mps/${member.id}`}
                className="block group"
              >
                <div className="flex flex-col items-center text-center">
                  {/* Photo with role badge */}
                  <div className="relative mb-3">
                    {photoUrl && !imageError ? (
                      <img
                        src={photoUrl}
                        alt={member.name}
                        className={`${large ? 'w-28 h-36' : 'w-24 h-32'} rounded-lg object-cover bg-bg-elevated border-2 border-bg-elevated group-hover:border-accent-red transition-colors`}
                        onError={() => setImageError(true)}
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
          };

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

            {/* Recent Committee Activity */}
            {committee.meetings && committee.meetings.length > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm text-text-secondary mb-2">
                  <strong className="text-text-primary">Recent Committee Activity:</strong>
                </p>
                <div className="flex flex-wrap gap-2">
                  {committee.meetings.slice(0, 3).map((meeting: any) => {
                    const meetingDate = new Date(meeting.date);
                    const formattedDate = meetingDate.toLocaleDateString('en-CA', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });
                    return (
                      <div key={`${meeting.date}-${meeting.number}`} className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-300">
                        Meeting #{meeting.number} - {formattedDate}
                        {meeting.has_evidence && ' (Evidence available)'}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
                </>
              ),
            },
            {
              id: 'meetings',
              label: 'Meetings',
              content: (
                <Card>
                  <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
                    <Calendar className="h-6 w-6 mr-2 text-accent-red" />
                    Recent Committee Meetings
                  </h2>

                  {meetingsLoading ? (
                    <Loading />
                  ) : meetings.length > 0 ? (
                    <div className="space-y-3">
                      {meetings.map((meeting: any) => (
                        <div
                          key={`${meeting.date}-${meeting.number}`}
                          className="p-4 rounded-lg bg-bg-elevated hover:bg-bg-elevated/80 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <Calendar className="h-5 w-5 text-accent-red" />
                              <div>
                                <div className="font-semibold text-text-primary">
                                  Meeting #{meeting.number}
                                </div>
                                <div className="text-sm text-text-secondary">
                                  {new Date(meeting.date).toLocaleDateString('en-CA', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {meeting.in_camera && (
                                <span className="text-xs px-2 py-1 rounded bg-gray-500/20 text-gray-400">
                                  In Camera
                                </span>
                              )}
                              {meeting.has_evidence && (
                                <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">
                                  Evidence Available
                                </span>
                              )}
                            </div>
                          </div>
                          {meeting.meeting_url && (
                            <a
                              href={`https://openparliament.ca${meeting.meeting_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-accent-red hover:text-accent-red-hover font-medium flex items-center gap-1 mt-2"
                            >
                              View on OpenParliament
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-text-secondary">No recent meetings found.</p>
                  )}
                </Card>
              ),
            },
            {
              id: 'testimony',
              label: 'Testimony',
              content: (
                <Card>
                  <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
                    <MessageSquare className="h-6 w-6 mr-2 text-accent-red" />
                    Recent Committee Testimony
                  </h2>

                  {testimonyLoading ? (
                    <Loading />
                  ) : testimony.length > 0 ? (
                    <div className="space-y-4">
                      {testimony.map((statement: any) => (
                        <div
                          key={statement.id}
                          className="p-4 rounded-lg bg-bg-elevated hover:bg-bg-elevated/80 transition-colors"
                        >
                          {/* Speaker Info */}
                          {statement.madeBy && (() => {
                            const photoUrl = getMPPhotoUrl(statement.madeBy);

                            return (
                              <div className="flex items-center gap-3 mb-3">
                                {photoUrl && (
                                  <img
                                    src={photoUrl}
                                    alt={statement.madeBy.name}
                                    className="w-12 h-12 rounded-full object-cover bg-bg-elevated"
                                  />
                                )}
                                <div>
                                  <Link
                                    href={`/mps/${statement.madeBy.id}`}
                                    className="font-semibold text-text-primary hover:text-accent-red"
                                  >
                                    {statement.madeBy.name}
                                  </Link>
                                  <div className="text-sm text-text-secondary">
                                    {statement.madeBy.party}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Topic Headers */}
                          {(statement.h1_en || statement.h2_en || statement.h3_en) && (
                            <div className="mb-3 pb-3 border-b border-border-subtle">
                              {statement.h1_en && (
                                <div className="text-xs font-semibold text-accent-red uppercase mb-1">
                                  {statement.h1_en}
                                </div>
                              )}
                              {statement.h2_en && (
                                <div className="font-bold text-lg text-text-primary">
                                  {statement.h2_en}
                                </div>
                              )}
                              {statement.h3_en && (
                                <div className="text-sm text-text-secondary mt-1">
                                  {statement.h3_en}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Content */}
                          <p className="text-text-primary mb-3 whitespace-pre-line line-clamp-4">
                            {statement.content_en}
                          </p>

                          {/* Metadata */}
                          <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
                            <div className="flex items-center gap-4 text-xs text-text-secondary">
                              {statement.partOf?.date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(statement.partOf.date).toLocaleDateString('en-CA', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </span>
                              )}
                              {statement.wordcount && (
                                <span>{statement.wordcount} words</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-text-secondary">No recent testimony found.</p>
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
