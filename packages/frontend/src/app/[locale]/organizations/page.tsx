/**
 * Organizations list page - Browse all lobbying organizations
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useLocale } from 'next-intl';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loading } from '@/components/Loading';
import { Card } from '@canadagpt/design-system';
import { SEARCH_ORGANIZATIONS } from '@/lib/queries';
import Link from 'next/link';
import { Building2, Search, Users, FileText, TrendingUp } from 'lucide-react';

export default function OrganizationsPage() {
  const locale = useLocale();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setTimeout(() => setDebouncedSearch(value), 300);
  };

  const { data, loading } = useQuery(SEARCH_ORGANIZATIONS, {
    variables: {
      searchTerm: debouncedSearch || 'a', // Default to 'a' to get some results
      limit: 50
    },
    skip: debouncedSearch.length === 0,
  });

  const organizations = data?.organizations || [];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 page-container">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-text-primary mb-2">
            Lobbying Organizations
          </h1>
          <p className="text-text-secondary">
            Browse organizations that lobby the Canadian government
          </p>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search organizations by name or industry..."
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
              <Building2 className="h-16 w-16 text-text-tertiary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                Start Searching
              </h3>
              <p className="text-text-secondary">
                Enter a search term to find lobbying organizations
              </p>
            </div>
          </Card>
        ) : organizations.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <Search className="h-16 w-16 text-text-tertiary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                No Results Found
              </h3>
              <p className="text-text-secondary">
                Try searching for a different organization name or industry
              </p>
            </div>
          </Card>
        ) : (
          <>
            <div className="mb-4 text-sm text-text-secondary">
              Found {organizations.length} organization{organizations.length !== 1 ? 's' : ''}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {organizations.map((org: any) => {
                const totalLobbyists = org.lobbyistsConnection?.totalCount || 0;
                const activeRegistrations = org.registrationsConnection?.totalCount || 0;

                return (
                  <Link
                    key={org.id}
                    href={`/${locale}/organizations/${org.id}`}
                    className="block"
                  >
                    <Card className="h-full hover:border-accent-red transition-colors cursor-pointer">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="p-3 bg-bg-elevated rounded-lg flex-shrink-0">
                          <Building2 className="h-8 w-8 text-accent-red" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-text-primary mb-1 line-clamp-2">
                            {org.name}
                          </h3>
                          {org.industry && (
                            <span className="text-xs px-2 py-1 rounded bg-gray-500/20 text-gray-400 inline-block">
                              {org.industry}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="flex items-center gap-2 text-text-tertiary mb-1">
                            <Users className="h-4 w-4" />
                            <span>Lobbyists</span>
                          </div>
                          <div className="text-xl font-bold text-accent-red">
                            {totalLobbyists}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-text-tertiary mb-1">
                            <FileText className="h-4 w-4" />
                            <span>Active Regs</span>
                          </div>
                          <div className="text-xl font-bold text-accent-red">
                            {activeRegistrations}
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
