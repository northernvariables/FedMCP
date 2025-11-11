/**
 * Individual organization detail page
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
import { GET_ORGANIZATION } from '@/lib/queries';
import Link from 'next/link';
import { Building2, Users, FileText, TrendingUp, Calendar, ExternalLink } from 'lucide-react';
import { ShareButton } from '@/components/ShareButton';

export default function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const locale = useLocale();

  const { data, loading, error } = useQuery(GET_ORGANIZATION, {
    variables: { id },
  });

  const organization = data?.organizations?.[0];

  if (loading) {
    return (
      <>
        <Header />
        <Loading />
        <Footer />
      </>
    );
  }

  if (error || !organization) {
    return (
      <>
        <Header />
        <div className="page-container">
          <Card>
            <p className="text-accent-red">Organization not found</p>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  const totalLobbyists = organization.lobbyistsConnection?.totalCount || 0;
  const totalBills = organization.lobbiedOnConnection?.totalCount || 0;
  const totalRegistrations = organization.registrationsConnection?.totalCount || 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 page-container">
        {/* Organization Header */}
        <div className="mb-8 relative">
          {/* Share Button - Top Right */}
          <div className="absolute top-0 right-0">
            <ShareButton
              url={`/${locale}/organizations/${id}`}
              title={organization.name}
              description={organization.industry ? `${organization.industry} lobbying organization` : 'Lobbying organization'}
              size="md"
            />
          </div>

          <div className="flex items-start space-x-6 pr-12">
            <div className="p-6 bg-bg-elevated rounded-xl">
              <Building2 className="h-16 w-16 text-accent-red" />
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-text-primary mb-2">{organization.name}</h1>
              {organization.industry && (
                <p className="text-xl text-text-secondary mb-4">
                  {organization.industry}
                </p>
              )}

              {/* Summary Stats */}
              <div className="flex flex-wrap gap-6 text-sm text-text-secondary mt-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{totalLobbyists} lobbyist{totalLobbyists !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>{totalBills} bill{totalBills !== 1 ? 's' : ''} lobbied</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>{totalRegistrations} active registration{totalRegistrations !== 1 ? 's' : ''}</span>
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
                  {/* Lobbying Summary */}
                  <Card className="mb-6">
                    <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
                      <TrendingUp className="h-6 w-6 mr-2 text-accent-red" />
                      Lobbying Summary
                    </h2>

                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <div className="text-3xl font-bold text-accent-red">{totalLobbyists}</div>
                        <div className="text-sm text-text-secondary">Total Lobbyists</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-accent-red">{totalBills}</div>
                        <div className="text-sm text-text-secondary">Bills Lobbied</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-accent-red">{totalRegistrations}</div>
                        <div className="text-sm text-text-secondary">Active Registrations</div>
                      </div>
                    </div>
                  </Card>

                  {/* Recent Bills Lobbied */}
                  {organization.lobbiedOnConnection?.edges && organization.lobbiedOnConnection.edges.length > 0 && (
                    <Card className="mb-6">
                      <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
                        <FileText className="h-6 w-6 mr-2 text-accent-red" />
                        Recent Bills Lobbied (Preview)
                      </h2>
                      <div className="space-y-3">
                        {organization.lobbiedOnConnection.edges.slice(0, 5).map((edge: any) => {
                          const bill = edge.node;
                          const lobbyingDate = edge.properties?.date;
                          const subject = edge.properties?.subject;

                          return (
                            <Link
                              key={bill.number + bill.session}
                              href={`/${locale}/bills/${bill.session}/${bill.number}`}
                              className="block p-3 rounded-lg bg-bg-elevated hover:bg-bg-elevated/80 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="font-semibold text-text-primary mb-1">
                                    Bill {bill.number} ({bill.session})
                                  </div>
                                  <div className="text-sm text-text-secondary line-clamp-2">
                                    {bill.title || bill.title_fr || 'No title available'}
                                  </div>
                                </div>
                                <ExternalLink className="h-4 w-4 text-text-secondary ml-4 mt-1 flex-shrink-0" />
                              </div>
                              {lobbyingDate && (
                                <div className="text-xs text-text-tertiary flex items-center gap-2 mt-2">
                                  <Calendar className="h-3 w-3" />
                                  Lobbied on {new Date(lobbyingDate).toLocaleDateString()}
                                </div>
                              )}
                              {subject && (
                                <div className="text-xs text-text-tertiary mt-1">
                                  Subject: {subject}
                                </div>
                              )}
                              {bill.status && (
                                <span className="inline-block mt-2 text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400">
                                  {bill.status}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </Card>
                  )}

                  {/* Top Lobbyists Preview */}
                  {organization.lobbyistsConnection?.edges && organization.lobbyistsConnection.edges.length > 0 && (
                    <Card>
                      <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
                        <Users className="h-6 w-6 mr-2 text-accent-red" />
                        Lobbyists (Preview)
                      </h2>
                      <div className="space-y-2">
                        {organization.lobbyistsConnection.edges.slice(0, 5).map((edge: any) => {
                          const lobbyist = edge.node;

                          return (
                            <Link
                              key={lobbyist.id}
                              href={`/${locale}/lobbyists/${lobbyist.id}`}
                              className="block p-3 rounded-lg bg-bg-elevated hover:bg-bg-elevated/80 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-semibold text-accent-red hover:underline">
                                    {lobbyist.name}
                                  </div>
                                  {lobbyist.firm && (
                                    <div className="text-sm text-text-tertiary">{lobbyist.firm}</div>
                                  )}
                                </div>
                                <ExternalLink className="h-4 w-4 text-text-secondary" />
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
              id: 'lobbyists',
              label: 'Lobbyists',
              content: (
                <Card>
                  <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
                    <Users className="h-6 w-6 mr-2 text-accent-red" />
                    All Lobbyists
                  </h2>

                  {organization.lobbyistsConnection?.edges && organization.lobbyistsConnection.edges.length > 0 ? (
                    <div className="space-y-2">
                      {organization.lobbyistsConnection.edges.map((edge: any) => {
                        const lobbyist = edge.node;

                        return (
                          <Link
                            key={lobbyist.id}
                            href={`/${locale}/lobbyists/${lobbyist.id}`}
                            className="block p-3 rounded-lg bg-bg-elevated hover:bg-bg-elevated/80 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold text-accent-red hover:underline">
                                  {lobbyist.name}
                                </div>
                                {lobbyist.firm && (
                                  <div className="text-sm text-text-tertiary">{lobbyist.firm}</div>
                                )}
                              </div>
                              <ExternalLink className="h-4 w-4 text-text-secondary" />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-text-secondary">No lobbyists found for this organization.</p>
                  )}
                </Card>
              ),
            },
            {
              id: 'bills',
              label: 'Bills Lobbied',
              content: (
                <Card>
                  <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center">
                    <FileText className="h-6 w-6 mr-2 text-accent-red" />
                    All Bills Lobbied
                  </h2>

                  {organization.lobbiedOnConnection?.edges && organization.lobbiedOnConnection.edges.length > 0 ? (
                    <div className="space-y-3">
                      {organization.lobbiedOnConnection.edges.map((edge: any) => {
                        const bill = edge.node;
                        const lobbyingDate = edge.properties?.date;
                        const subject = edge.properties?.subject;

                        return (
                          <Link
                            key={bill.number + bill.session}
                            href={`/${locale}/bills/${bill.session}/${bill.number}`}
                            className="block p-3 rounded-lg bg-bg-elevated hover:bg-bg-elevated/80 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="font-semibold text-text-primary mb-1">
                                  Bill {bill.number} ({bill.session})
                                </div>
                                <div className="text-sm text-text-secondary line-clamp-2">
                                  {bill.title || bill.title_fr || 'No title available'}
                                </div>
                              </div>
                              <ExternalLink className="h-4 w-4 text-text-secondary ml-4 mt-1 flex-shrink-0" />
                            </div>
                            {lobbyingDate && (
                              <div className="text-xs text-text-tertiary flex items-center gap-2 mt-2">
                                <Calendar className="h-3 w-3" />
                                Lobbied on {new Date(lobbyingDate).toLocaleDateString()}
                              </div>
                            )}
                            {subject && (
                              <div className="text-xs text-text-tertiary mt-1">
                                Subject: {subject}
                              </div>
                            )}
                            {bill.status && (
                              <span className="inline-block mt-2 text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400">
                                {bill.status}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-text-secondary">No bills found for this organization.</p>
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

                  {organization.registrationsConnection?.edges && organization.registrationsConnection.edges.length > 0 ? (
                    <div className="space-y-3">
                      {organization.registrationsConnection.edges.map((edge: any) => {
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
                                <div className="text-sm text-text-secondary">
                                  Registrant: {registration.registrant_name}
                                </div>
                              </div>
                              {registration.active && (
                                <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">
                                  Active
                                </span>
                              )}
                            </div>
                            {registration.effective_date && (
                              <div className="text-xs text-text-tertiary flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                Effective: {new Date(registration.effective_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-text-secondary">No registrations found for this organization.</p>
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
