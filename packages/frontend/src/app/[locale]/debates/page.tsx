'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useTranslations, useLocale } from 'next-intl';
import { GET_RECENT_DEBATES, GET_QUESTION_PERIOD_DEBATES } from '@/lib/queries';
import { DebateCard } from '@/components/debates/DebateCard';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Search, Filter, Calendar } from 'lucide-react';

export default function DebatesPage() {
  const t = useTranslations('debates');
  const locale = useLocale();

  // State
  const [filter, setFilter] = useState<'all' | 'debates' | 'committee' | 'qp'>('all');
  const [limit] = useState(20);

  // Determine query based on filter
  const isQuestionPeriod = filter === 'qp';
  const documentType = filter === 'debates' ? 'D' : filter === 'committee' ? 'E' : null;

  // Query
  const { data, loading, error } = useQuery(
    isQuestionPeriod ? GET_QUESTION_PERIOD_DEBATES : GET_RECENT_DEBATES,
    {
      variables: isQuestionPeriod
        ? { limit }
        : {
            limit,
            documentType,
            questionPeriodOnly: false
          }
    }
  );

  const debates = isQuestionPeriod
    ? data?.questionPeriodDebates || []
    : data?.recentDebates || [];

  return (
    <>
      <Header />
      <div className="min-h-screen bg-bg-base">
        {/* Header */}
        <div className="bg-bg-elevated border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="h-8 w-8 text-accent-red" />
            <h1 className="text-3xl font-bold text-text-primary">
              {locale === 'fr' ? 'Débats parlementaires' : 'Parliamentary Debates'}
            </h1>
          </div>
          <p className="text-lg text-text-secondary max-w-3xl">
            {locale === 'fr'
              ? 'Explorez les débats récents de la Chambre des communes et les témoignages des comités'
              : 'Explore recent House of Commons debates and committee testimony'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Filter className="h-5 w-5 text-text-tertiary" />
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-accent-red text-white'
                  : 'bg-bg-elevated text-text-secondary hover:bg-bg-overlay border border-border-subtle'
              }`}
            >
              {locale === 'fr' ? 'Tous' : 'All'}
            </button>
            <button
              onClick={() => setFilter('debates')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'debates'
                  ? 'bg-accent-red text-white'
                  : 'bg-bg-elevated text-text-secondary hover:bg-bg-overlay border border-border-subtle'
              }`}
            >
              {locale === 'fr' ? 'Débats de la Chambre' : 'House Debates'}
            </button>
            <button
              onClick={() => setFilter('committee')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'committee'
                  ? 'bg-accent-red text-white'
                  : 'bg-bg-elevated text-text-secondary hover:bg-bg-overlay border border-border-subtle'
              }`}
            >
              {locale === 'fr' ? 'Comités' : 'Committee'}
            </button>
            <button
              onClick={() => setFilter('qp')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'qp'
                  ? 'bg-accent-red text-white'
                  : 'bg-bg-elevated text-text-secondary hover:bg-bg-overlay border border-border-subtle'
              }`}
            >
              {locale === 'fr' ? 'Période des questions' : 'Question Period'}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent-red"></div>
            <p className="mt-4 text-text-secondary">
              {locale === 'fr' ? 'Chargement des débats...' : 'Loading debates...'}
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-bg-elevated border border-border-subtle rounded-lg p-6 text-center">
            <p className="text-text-secondary">
              {locale === 'fr'
                ? 'Erreur lors du chargement des débats. Veuillez réessayer.'
                : 'Error loading debates. Please try again.'}
            </p>
            <p className="text-sm text-text-tertiary mt-2">{error.message}</p>
          </div>
        )}

        {/* Debates List */}
        {!loading && !error && (
          <>
            {debates.length === 0 ? (
              <div className="bg-bg-elevated border border-border-subtle rounded-lg p-12 text-center">
                <Calendar className="h-16 w-16 text-text-tertiary mx-auto mb-4" />
                <p className="text-lg text-text-secondary">
                  {locale === 'fr'
                    ? 'Aucun débat trouvé pour ce filtre.'
                    : 'No debates found for this filter.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Results count */}
                <div className="text-sm text-text-tertiary">
                  {locale === 'fr'
                    ? `${debates.length} ${debates.length === 1 ? 'débat' : 'débats'}`
                    : `${debates.length} ${debates.length === 1 ? 'debate' : 'debates'}`}
                </div>

                {/* Debate cards */}
                {debates.map((debate: any) => (
                  <DebateCard key={debate.document.id} debate={debate} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
    <Footer />
    </>
  );
}
