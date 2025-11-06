/**
 * Lobbying registry page
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loading } from '@/components/Loading';
import { Card } from '@canadagpt/design-system';
import { SEARCH_LOBBY_REGISTRATIONS } from '@/lib/queries';
import { Search, Building, Users, FileText, TrendingUp } from 'lucide-react';

export default function LobbyingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);

  const { data, loading, error } = useQuery(SEARCH_LOBBY_REGISTRATIONS, {
    variables: {
      searchTerm: searchTerm || null,
      active: activeOnly,
      limit: 50,
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 page-container">
        <h1 className="text-4xl font-bold text-text-primary mb-2">Lobbying Registry</h1>
        <p className="text-text-secondary mb-8">
          Track corporate lobbying activity and government influence
        </p>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card elevated>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-accent-red mb-1">100K+</div>
                <div className="text-sm text-text-secondary">Total Registrations</div>
              </div>
              <Building className="h-12 w-12 text-accent-red opacity-20" />
            </div>
          </Card>

          <Card elevated>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-accent-red mb-1">350K+</div>
                <div className="text-sm text-text-secondary">Communication Events</div>
              </div>
              <Users className="h-12 w-12 text-accent-red opacity-20" />
            </div>
          </Card>

          <Card elevated>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-accent-red mb-1">15K+</div>
                <div className="text-sm text-text-secondary">Active Lobbyists</div>
              </div>
              <FileText className="h-12 w-12 text-accent-red opacity-20" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search by organization name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border-subtle rounded-lg text-text-primary placeholder-text-tertiary focus:border-accent-red focus:outline-none transition-colors"
            />
          </div>

          {/* Active filter */}
          <label className="flex items-center gap-2 px-4 py-2 bg-bg-secondary border border-border-subtle rounded-lg cursor-pointer hover:border-accent-red transition-colors">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="w-4 h-4 text-accent-red bg-bg-elevated border-border-subtle rounded focus:ring-accent-red focus:ring-2"
            />
            <span className="text-text-primary">Active Only</span>
          </label>
        </div>

        {/* Registrations List */}
        {loading ? (
          <Loading />
        ) : error ? (
          <Card>
            <p className="text-accent-red">Error loading lobbying data: {error.message}</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {data?.searchLobbyRegistrations?.map((registration: any) => (
              <Card key={registration.id} className="hover:border-accent-red transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-text-primary">
                        {registration.client_org_name}
                      </h3>
                      {registration.active && (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 font-semibold">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary mb-2">
                      Registrant: {registration.registrant_name}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      Registration: {registration.reg_number}
                    </p>
                  </div>
                </div>

                {registration.subject_matters && registration.subject_matters.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border-subtle">
                    <div className="text-xs text-text-tertiary mb-2">Subject Matters:</div>
                    <div className="flex flex-wrap gap-2">
                      {registration.subject_matters.slice(0, 5).map((subject: string, index: number) => (
                        <span
                          key={index}
                          className="text-xs px-2 py-1 rounded bg-bg-elevated text-text-secondary"
                        >
                          {subject}
                        </span>
                      ))}
                      {registration.subject_matters.length > 5 && (
                        <span className="text-xs px-2 py-1 text-text-tertiary">
                          +{registration.subject_matters.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {data?.searchLobbyRegistrations?.length === 0 && (
          <Card>
            <p className="text-text-secondary text-center">
              No lobbying registrations found matching your criteria.
            </p>
          </Card>
        )}

        {/* Information Section */}
        <Card className="mt-8 bg-bg-overlay border-border-emphasis">
          <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-accent-red" />
            About the Lobbying Registry
          </h3>
          <div className="text-text-secondary space-y-3 text-sm">
            <p>
              The Registry of Lobbyists tracks communication between lobbyists and federal public office holders.
              This data comes from the Office of the Commissioner of Lobbying of Canada.
            </p>
            <p>
              <strong className="text-text-primary">What is lobbying?</strong> Lobbying involves
              communication with public office holders to influence government decisions on policies, programs,
              or the awarding of contracts.
            </p>
            <p>
              <strong className="text-text-primary">Who must register?</strong> Consultant lobbyists
              and in-house lobbyists (corporate and organization) must register their lobbying activities.
            </p>
            <p>
              <strong className="text-text-primary">Data coverage:</strong> This registry includes
              100,000+ registrations and 350,000+ communication reports from 1996 to present.
            </p>
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
