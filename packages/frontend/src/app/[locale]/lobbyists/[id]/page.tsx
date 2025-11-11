/**
 * Individual lobbyist detail page
 */

'use client';

import React, { use } from 'react';
import { useQuery } from '@apollo/client';
import { useLocale } from 'next-intl';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loading } from '@/components/Loading';
import { Tabs } from '@/components/Tabs';
import { Card } from '@canadagpt/design-system';
import { GET_LOBBYIST } from '@/lib/queries';
import Link from 'next/link';
import { User, Building2, Users, FileText, Calendar, ExternalLink } from 'lucide-react';
import { ShareButton } from '@/components/ShareButton';

export default function LobbyistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const locale = useLocale();

  const { data, loading, error } = useQuery(GET_LOBBYIST, {
    variables: { id },
  });

  const lobbyist = data?.lobbyists?.[0];

  if (loading) {
    return (
      <>
        <Header />
        <Loading />
        <Footer />
      </>
    );
  }

  if (error || !lobbyist) {
    return (
      <>
        <Header />
        <div className="page-container">
          <Card>
            <p className="text-accent-red">Lobbyist not found</p>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  const totalMeetings = lobbyist.metWithConnection?.totalCount || 0;
  const totalRegistrations = lobbyist.registeredForConnection?.totalCount || 0;
  const organization = lobbyist.worksFor;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 page-container">
        {/* Lobbyist Header */}
        <div className="mb-8 relative">
          {/* Share Button - Top Right */}
          <div className="absolute top-0 right-0">
            <ShareButton
              url={`/${locale}/lobbyists/${id}`}
              title={lobbyist.name}
              description={lobbyist.firm ? `Lobbyist at ${lobbyist.firm}` : 'Professional lobbyist'}
              size="md"
            />
          </div>

          <div className="flex items-start space-x-6 pr-12">
            <div className="p-6 bg-bg-elevated rounded-xl">
              <User className="h-16 w-16 text-accent-red" />
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-text-primary mb-2">{lobbyist.name}</h1>
              {lobbyist.firm && (
                <p className="text-xl text-text-secondary mb-2">
                  {lobbyist.firm}
                </p>
              )}
              {organization && (
                <Link
                  href={`/${locale}/organizations/${organization.id}`}
                  className="text-lg text-accent-red hover:underline inline-flex items-center gap-2"
                >
                  <Building2 className="h-4 w-4" />
                  {organization.name}
                </Link>
              )}

              {/* Summary Stats */}
              <div className="flex flex-wrap gap-6 text-sm text-text-secondary mt-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{totalMeetings} meeting{totalMeetings !== 1 ? 's' : ''} with MPs</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>{totalRegistrations} registration{totalRegistrations !== 1 ? 's' : ''}</span>
                </div>
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
                  {/* Activity Summary */}
                  <Card className="mb-6">
                    <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
                      <FileText className="h-6 w-6 mr-2 text-accent-red" />
                      Activity Summary
                    </h2>

                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <div className="text-3xl font-bold text-accent-red">{totalMeetings}</div>
                        <div className="text-sm text-text-secondary">MP Meetings</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-accent-red">{totalRegistrations}</div>
                        <div className="text-sm text-text-secondary">Total Registrations</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-accent-red">
                          {lobbyist.registeredForConnection?.edges?.filter((e: any) => e.node.active).length || 0}
                        </div>
                        <div className="text-sm text-text-secondary">Active Registrations</div>
                      </div>
                    </div>
                  </Card>

                  {/* Organization */}
                  {organization && (
                    <Card className="mb-6">
                      <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
                        <Building2 className="h-6 w-6 mr-2 text-accent-red" />
                        Organization
                      </h2>
                      <Link
                        href={`/${locale}/organizations/${organization.id}`}
                        className="block p-4 rounded-lg bg-bg-elevated hover:bg-bg-elevated/80 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-accent-red hover:underline text-lg">
                              {organization.name}
                            </div>
                            {organization.industry && (
                              <div className="text-sm text-text-tertiary mt-1">{organization.industry}</div>
                            )}
                          </div>
                          <ExternalLink className="h-5 w-5 text-text-secondary" />
                        </div>
                      </Link>
                    </Card>
                  )}

                  {/* Recent Meetings Preview */}
                  {lobbyist.metWithConnection?.edges && lobbyist.metWithConnection.edges.length > 0 && (
                    <Card>
                      <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
                        <Users className="h-6 w-6 mr-2 text-accent-red" />
                        Recent MP Meetings (Preview)
                      </h2>
                      <div className="space-y-3">
                        {lobbyist.metWithConnection.edges.slice(0, 5).map((edge: any, index: number) => {
                          const mp = edge.node;
                          const meeting = edge.properties;

                          return (
                            <Link
                              key={`${mp.id}-${meeting.last_contact || meeting.first_contact}-${index}`}
                              href={`/${locale}/mps/${mp.id}`}
                              className="block p-3 rounded-lg bg-bg-elevated hover:bg-bg-elevated/80 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="font-semibold text-accent-red hover:underline">
                                    {mp.name}
                                  </div>
                                  <div className="text-sm text-text-secondary">
                                    {mp.party} • {mp.riding}
                                  </div>
                                </div>
                                <div className="text-sm text-text-tertiary whitespace-nowrap ml-4">
                                  {meeting.last_contact ? (
                                    <>
                                      <div className="font-semibold">
                                        {new Date(meeting.last_contact).toLocaleDateString()}
                                      </div>
                                      <div className="text-xs">Most recent</div>
                                    </>
                                  ) : meeting.first_contact ? (
                                    <div>{new Date(meeting.first_contact).toLocaleDateString()}</div>
                                  ) : (
                                    <div>Date unknown</div>
                                  )}
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </Card>
                  )}
                </>
              ),
            },
            {
              id: 'meetings',
              label: 'MP Meetings',
              content: (
                <Card>
                  <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
                    <Users className="h-6 w-6 mr-2 text-accent-red" />
                    All MP Meetings
                  </h2>

                  {lobbyist.metWithConnection?.edges && lobbyist.metWithConnection.edges.length > 0 ? (
                    <div className="space-y-3">
                      {lobbyist.metWithConnection.edges.map((edge: any, index: number) => {
                        const mp = edge.node;
                        const meeting = edge.properties;

                        return (
                          <Link
                            key={`${mp.id}-${meeting.last_contact || meeting.first_contact}-${index}`}
                            href={`/${locale}/mps/${mp.id}`}
                            className="block p-3 rounded-lg bg-bg-elevated hover:bg-bg-elevated/80 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="font-semibold text-accent-red hover:underline">
                                  {mp.name}
                                </div>
                                <div className="text-sm text-text-secondary">
                                  {mp.party} • {mp.riding}
                                </div>
                              </div>
                              <div className="text-sm text-text-tertiary whitespace-nowrap ml-4 flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                {meeting.last_contact ? (
                                  <div className="text-right">
                                    <div className="font-semibold">
                                      {new Date(meeting.last_contact).toLocaleDateString()}
                                    </div>
                                    <div className="text-xs">Most recent</div>
                                  </div>
                                ) : meeting.first_contact ? (
                                  <div>{new Date(meeting.first_contact).toLocaleDateString()}</div>
                                ) : (
                                  <div>Date unknown</div>
                                )}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-text-secondary">No MP meetings recorded.</p>
                  )}
                </Card>
              ),
            },
            {
              id: 'registrations',
              label: 'Registrations',
              content: (
                <Card>
                  <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
                    <FileText className="h-6 w-6 mr-2 text-accent-red" />
                    Lobby Registrations
                  </h2>

                  {lobbyist.registeredForConnection?.edges && lobbyist.registeredForConnection.edges.length > 0 ? (
                    <div className="space-y-3">
                      {lobbyist.registeredForConnection.edges.map((edge: any) => {
                        const registration = edge.node;

                        return (
                          <div
                            key={registration.id}
                            className="p-3 rounded-lg bg-bg-elevated"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="font-semibold text-text-primary">
                                  {registration.reg_number}
                                </div>
                              </div>
                              {registration.active ? (
                                <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">
                                  Active
                                </span>
                              ) : (
                                <span className="text-xs px-2 py-1 rounded bg-gray-500/20 text-gray-400">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <div className="space-y-1 text-sm">
                              {registration.effective_date && (
                                <div className="text-text-tertiary flex items-center gap-2">
                                  <Calendar className="h-3 w-3" />
                                  Effective: {new Date(registration.effective_date).toLocaleDateString()}
                                </div>
                              )}
                              {registration.end_date && (
                                <div className="text-text-tertiary flex items-center gap-2">
                                  <Calendar className="h-3 w-3" />
                                  End: {new Date(registration.end_date).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-text-secondary">No registrations found for this lobbyist.</p>
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
