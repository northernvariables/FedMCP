'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useTranslations, useLocale } from 'next-intl';
import { GET_RECENT_DEBATES, GET_QUESTION_PERIOD_DEBATES } from '@/lib/queries';
import { DebateCard } from '@/components/debates/DebateCard';
import { DebatesCalendar } from '@/components/debates/DebatesCalendar';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Search, Filter, Calendar, X } from 'lucide-react';

export default function DebatesPage() {
  const t = useTranslations('debates');
  const locale = useLocale();

  // State
  const [filter, setFilter] = useState<'all' | 'debates' | 'committee' | 'qp'>('all');
  const [limit] = useState(20);
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [calendarViewMode, setCalendarViewMode] = useState<1 | 3>(3);
  const [searchQuery, setSearchQuery] = useState('');

  // Handlers
  const handleDateRangeSelect = (start: Date | null, end: Date | null) => {
    setSelectedStartDate(start);
    setSelectedEndDate(end);
  };

  const handleViewModeChange = (mode: 1 | 3) => {
    setCalendarViewMode(mode);
  };

  const formatDateForQuery = (date: Date | null) => {
    if (!date) return undefined;
    return date.toISOString().split('T')[0];
  };

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

  // Search filtering
  const filteredDebates = useMemo(() => {
    if (!searchQuery.trim()) return debates;

    const query = searchQuery.toLowerCase();
    return debates.filter((debate: any) => {
      // Search in top topics
      const topicsMatch = debate.top_topics?.some((topic: string) =>
        topic.toLowerCase().includes(query)
      );

      // Search in metadata
      const typeMatch = debate.document.document_type?.toLowerCase().includes(query);
      const sessionMatch = debate.document.session_id?.toLowerCase().includes(query);

      // Search in keywords (when available)
      const keywordsJson = locale === 'fr' ? debate.document.keywords_fr : debate.document.keywords_en;
      let keywordsMatch = false;
      if (keywordsJson) {
        try {
          const keywords = JSON.parse(keywordsJson);
          keywordsMatch = keywords.some((kw: any) =>
            kw.word.toLowerCase().includes(query)
          );
        } catch {}
      }

      return topicsMatch || typeMatch || sessionMatch || keywordsMatch;
    });
  }, [debates, searchQuery, locale]);

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

      {/* Conditional Layout: Side-by-side (1 month) or Stacked (3 months) */}
      {calendarViewMode === 1 ? (
        /* 1-MONTH VIEW: Side-by-side layout */
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar Sidebar (1/3) */}
            <div className="lg:col-span-1">
              <div className="sticky top-4">
                <DebatesCalendar
                  onDateRangeSelect={handleDateRangeSelect}
                  onViewModeChange={handleViewModeChange}
                  initialViewMode={calendarViewMode}
                />
              </div>
            </div>

            {/* Content Area (2/3) */}
            <div className="lg:col-span-2">
              {/* Filters */}
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

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={locale === 'fr' ? 'Rechercher par sujet, type, mots-clés...' : 'Search by topic, type, keywords...'}
              className="w-full pl-10 pr-10 py-3 bg-bg-elevated border border-border-subtle rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-red focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-bg-overlay rounded transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-text-tertiary" />
              </button>
            )}
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
            {filteredDebates.length === 0 ? (
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
                    ? `${filteredDebates.length} ${filteredDebates.length === 1 ? 'débat' : 'débats'}`
                    : `${filteredDebates.length} ${filteredDebates.length === 1 ? 'debate' : 'debates'}`}
                </div>

                {/* Debate cards */}
                {filteredDebates.map((debate: any) => (
                  <DebateCard key={debate.document.id} debate={debate} />
                ))}
              </div>
            )}
          </>
        )}
            </div>
          </div>
        </div>
      ) : (
        /* 3-MONTH VIEW: Stacked vertical layout */
        <>
          {/* Calendar at top */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <DebatesCalendar
              onDateRangeSelect={handleDateRangeSelect}
              onViewModeChange={handleViewModeChange}
              initialViewMode={calendarViewMode}
            />
          </div>

          {/* Content below */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Filters */}
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

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={locale === 'fr' ? 'Rechercher par sujet, type, mots-clés...' : 'Search by topic, type, keywords...'}
                  className="w-full pl-10 pr-10 py-3 bg-bg-elevated border border-border-subtle rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-red focus:border-transparent transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-bg-overlay rounded transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4 text-text-tertiary" />
                  </button>
                )}
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
                {filteredDebates.length === 0 ? (
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
                        ? `${filteredDebates.length} ${filteredDebates.length === 1 ? 'débat' : 'débats'}`
                        : `${filteredDebates.length} ${filteredDebates.length === 1 ? 'debate' : 'debates'}`}
                    </div>

                    {/* Debate cards */}
                    {filteredDebates.map((debate: any) => (
                      <DebateCard key={debate.document.id} debate={debate} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
    <Footer />
    </>
  );
}
