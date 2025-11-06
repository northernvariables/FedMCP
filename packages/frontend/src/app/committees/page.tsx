/**
 * Committees list page
 */

'use client';

import { useQuery } from '@apollo/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loading } from '@/components/Loading';
import { Card } from '@canadagpt/design-system';
import { GET_COMMITTEES } from '@/lib/queries';
import { Users } from 'lucide-react';

interface Committee {
  code: string;
  name: string;
  mandate?: string;
  chamber: string;
  membersAggregate: {
    count: number;
  };
}

export default function CommitteesPage() {
  const { data, loading, error } = useQuery(GET_COMMITTEES);

  const committees: Committee[] = data?.committees || [];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 page-container">
        <h1 className="text-4xl font-bold text-text-primary mb-2">Parliamentary Committees</h1>
        <p className="text-text-secondary mb-8">Browse all {committees.length} House of Commons committees</p>

        {/* Committees Grid */}
        {loading ? (
          <Loading />
        ) : error ? (
          <Card className="p-8 text-center">
            <p className="text-text-secondary">Error loading committees: {error.message}</p>
          </Card>
        ) : committees.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="h-12 w-12 text-text-tertiary mx-auto mb-4" />
            <p className="text-lg text-text-secondary mb-2">No committees found</p>
            <p className="text-sm text-text-tertiary">Committee data is being ingested</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {committees.map((committee) => (
              <Card
                key={committee.code}
                elevated
                className="h-full hover:border-accent-red transition-colors cursor-pointer"
                onClick={() => window.location.href = `/committees/${committee.code}`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-shrink-0 w-12 h-12 bg-accent-red/10 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-accent-red" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text-primary mb-1 truncate">{committee.name}</h3>
                    <p className="text-xs text-text-tertiary font-mono">{committee.code}</p>
                  </div>
                </div>

                {committee.mandate && (
                  <p className="text-sm text-text-secondary mb-3 line-clamp-2">
                    {committee.mandate}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-text-tertiary">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{committee.membersAggregate.count} members</span>
                  </div>
                  <span className="text-xs px-2 py-1 bg-bg-tertiary rounded">
                    {committee.chamber}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
