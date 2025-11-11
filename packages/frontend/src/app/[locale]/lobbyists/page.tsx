/**
 * Lobbyists list page - Browse all lobbyists
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useLocale } from 'next-intl';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loading } from '@/components/Loading';
import { Card } from '@canadagpt/design-system';
import { SEARCH_LOBBYISTS } from '@/lib/queries';
import Link from 'next/link';
import { User, Search, Users, FileText, Building2 } from 'lucide-react';

export default function LobbyistsPage() {
  const locale = useLocale();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setTimeout(() => setDebouncedSearch(value), 300);
  };

  const { data, loading } = useQuery(SEARCH_LOBBYISTS, {
    variables: {
      searchTerm: debouncedSearch || 'a', // Default to 'a' to get some results
      limit: 50
    },
    skip: debouncedSearch.length === 0,
  });

  const lobbyists = data?.lobbyists || [];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 page-container">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-text-primary mb-2">
            Lobbyists
          </h1>
          <p className="text-text-secondary">
            Browse individual lobbyists who meet with government officials
          </p>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search lobbyists by name or firm..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-bg-elevated border border-border-subtle rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-red focus:border-transparent"
            />
          </div>
        </Card>

        {/* Results */}
        {loading ? (
          <Loading />
        ) : debouncedSearch.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <User className="h-16 w-16 text-text-tertiary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                Start Searching
              </h3>
              <p className="text-text-secondary">
                Enter a search term to find lobbyists
              </p>
            </div>
          </Card>
        ) : lobbyists.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <Search className="h-16 w-16 text-text-tertiary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                No Results Found
              </h3>
              <p className="text-text-secondary">
                Try searching for a different lobbyist name or firm
              </p>
            </div>
          </Card>
        ) : (
          <>
            <div className="mb-4 text-sm text-text-secondary">
              Found {lobbyists.length} lobbyist{lobbyists.length !== 1 ? 's' : ''}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lobbyists.map((lobbyist: any) => {
                const totalMeetings = lobbyist.metWithConnection?.totalCount || 0;
                const totalRegistrations = lobbyist.registeredForConnection?.totalCount || 0;
                const organization = lobbyist.worksFor;

                return (
                  <Link
                    key={lobbyist.id}
                    href={`/${locale}/lobbyists/${lobbyist.id}`}
                    className="block"
                  >
                    <Card className="h-full hover:border-accent-red transition-colors cursor-pointer">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="p-3 bg-bg-elevated rounded-lg flex-shrink-0">
                          <User className="h-8 w-8 text-accent-red" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-text-primary mb-1 line-clamp-2">
                            {lobbyist.name}
                          </h3>
                          {lobbyist.firm && (
                            <span className="text-xs px-2 py-1 rounded bg-gray-500/20 text-gray-400 inline-block mb-2">
                              {lobbyist.firm}
                            </span>
                          )}
                          {organization && (
                            <div className="flex items-center gap-1 text-xs text-text-tertiary">
                              <Building2 className="h-3 w-3" />
                              <span className="truncate">{organization.name}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="flex items-center gap-2 text-text-tertiary mb-1">
                            <Users className="h-4 w-4" />
                            <span>Meetings</span>
                          </div>
                          <div className="text-xl font-bold text-accent-red">
                            {totalMeetings}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-text-tertiary mb-1">
                            <FileText className="h-4 w-4" />
                            <span>Registrations</span>
                          </div>
                          <div className="text-xl font-bold text-accent-red">
                            {totalRegistrations}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
