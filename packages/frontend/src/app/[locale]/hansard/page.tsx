/**
 * Hansard Search Page - Search parliamentary debates and speeches
 * Fully bilingual with Quebec French support
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, NetworkStatus } from '@apollo/client';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loading } from '@/components/Loading';
import { Card, Button } from '@canadagpt/design-system';
import { SEARCH_HANSARD, SEARCH_MPS, GET_RECENT_STATEMENTS } from '@/lib/queries';
import { Link } from '@/i18n/navigation';
import { getMPPhotoUrl } from '@/lib/utils/mpPhotoUrl';
import {
  Search,
  Calendar,
  User,
  MessageSquare,
  Filter,
  TrendingUp,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Clock,
  Hash
} from 'lucide-react';
import { useBilingualContent } from '@/hooks/useBilingual';
import { usePageThreading } from '@/contexts/UserPreferencesContext';
import { ThreadToggle, ConversationThread } from '@/components/hansard';

export default function HansardPage() {
  const t = useTranslations('hansard');
  const locale = useLocale();
  const searchParams = useSearchParams();

  // Threading state
  const { enabled: threadedViewEnabled, setEnabled: setThreadedViewEnabled } = usePageThreading();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState(''); // Empty = default view
  const [showFilters, setShowFilters] = useState(false);
  const [expandedSpeech, setExpandedSpeech] = useState<string | null>(null);

  // Pagination state
  const [hasMore, setHasMore] = useState(true);
  const STATEMENTS_PER_PAGE = 10;

  // Filter state
  const [selectedParty, setSelectedParty] = useState<string>('');
  const [selectedMP, setSelectedMP] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [minWordCount, setMinWordCount] = useState<number>(0);
  const [documentType, setDocumentType] = useState<string>('');
  const [statementType, setStatementType] = useState<string>('');
  const [onlySubstantive, setOnlySubstantive] = useState(false);

  // Initialize from URL parameters
  useEffect(() => {
    const query = searchParams.get('q');
    const mp = searchParams.get('mp');
    const party = searchParams.get('party');
    const docType = searchParams.get('docType');
    const stmtType = searchParams.get('statementType');
    const excludeProcedural = searchParams.get('excludeProcedural');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (query) {
      setSearchQuery(query);
      setActiveQuery(query);
    }
    if (mp) setSelectedMP(mp);
    if (party) setSelectedParty(party);
    if (docType) setDocumentType(docType);
    if (stmtType) setStatementType(stmtType);
    if (excludeProcedural === 'true') setOnlySubstantive(true);
    if (startDate) setDateRange(prev => ({ ...prev, start: startDate }));
    if (endDate) setDateRange(prev => ({ ...prev, end: endDate }));

    // Show filters if any are set
    if (mp || party || docType || stmtType || excludeProcedural || startDate || endDate) {
      setShowFilters(true);
    }
  }, [searchParams]);

  // Fetch recent statements (default view)
  const { data: defaultStatementsData, loading: defaultLoading, fetchMore, networkStatus } = useQuery(GET_RECENT_STATEMENTS, {
    variables: {
      limit: STATEMENTS_PER_PAGE,
      offset: 0,
    },
    skip: activeQuery !== '', // Only fetch when not searching
    notifyOnNetworkStatusChange: true, // Required for fetchMore to trigger re-renders
  });

  // Distinguish between initial loading and "load more" loading
  // NetworkStatus.loading = initial load, NetworkStatus.fetchMore = pagination
  const isInitialLoading = networkStatus === NetworkStatus.loading;
  const isFetchingMore = networkStatus === NetworkStatus.fetchMore;

  // Fetch search results
  // TODO: Add language parameter once backend supports it: language: locale
  const { data: hansardData, loading: hansardLoading, refetch } = useQuery(SEARCH_HANSARD, {
    variables: {
      query: activeQuery,
      limit: 100,
    },
    skip: activeQuery === '', // Only fetch when actively searching
  });

  // Fetch MPs for autocomplete
  const { data: mpsData } = useQuery(SEARCH_MPS, {
    variables: { current: true, limit: 500 },
  });

  // Track if we have more statements to load
  // Initial load - assume we have more if we got a full page
  useEffect(() => {
    if (defaultStatementsData?.statements && activeQuery === '') {
      const currentLength = defaultStatementsData.statements.length;
      console.log('[useEffect] defaultStatementsData updated, length:', currentLength);
      // If we have at least one full page, assume there might be more
      setHasMore(currentLength >= STATEMENTS_PER_PAGE);
    }
  }, [defaultStatementsData, activeQuery]);

  // Filter results based on advanced filters
  const filteredResults = useMemo(() => {
    // Use default statements if not searching, otherwise use search results
    const sourceData = activeQuery === ''
      ? (defaultStatementsData?.statements || [])
      : (hansardData?.searchHansard || []);

    console.log('[filteredResults] Source data length:', sourceData.length);
    console.log('[filteredResults] First 3 items:', sourceData.slice(0, 3).map((s: any) => ({ id: s.id, time: s.time, date: s.partOf?.date })));
    console.log('[filteredResults] Last 3 items:', sourceData.slice(-3).map((s: any) => ({ id: s.id, time: s.time, date: s.partOf?.date })));

    if (!sourceData.length) return [];

    let results = [...sourceData];

    // Party filter
    if (selectedParty) {
      results = results.filter(speech =>
        speech.madeBy?.party === selectedParty
      );
    }

    // MP filter
    if (selectedMP) {
      results = results.filter(speech =>
        speech.madeBy?.id === selectedMP
      );
    }

    // Date range filter
    if (dateRange.start) {
      results = results.filter(speech =>
        speech.partOf?.date >= dateRange.start
      );
    }
    if (dateRange.end) {
      results = results.filter(speech =>
        speech.partOf?.date <= dateRange.end
      );
    }

    // Word count filter
    if (minWordCount > 0) {
      results = results.filter(speech =>
        (speech.wordcount || 0) >= minWordCount
      );
    }

    // Document type filter
    if (documentType) {
      results = results.filter(speech =>
        speech.partOf?.document_type === documentType
      );
    }

    // Statement type filter
    if (statementType) {
      results = results.filter(speech =>
        speech.statement_type === statementType
      );
    }

    // Procedural filter
    if (onlySubstantive) {
      results = results.filter(speech => !speech.procedural);
    }

    return results;
  }, [hansardData, defaultStatementsData, activeQuery, selectedParty, selectedMP, dateRange, minWordCount, documentType, statementType, onlySubstantive]);

  // Handle search
  const handleSearch = () => {
    if (searchQuery.trim()) {
      setActiveQuery(searchQuery);
      setHasMore(true);
    }
  };

  // Handle popular topic click
  const handleTopicClick = (query: string) => {
    setSearchQuery(query);
    setActiveQuery(query);
    setHasMore(true);
  };

  // Handle load more for default view
  const handleLoadMore = async () => {
    console.log('=== handleLoadMore clicked ===');
    console.log('activeQuery:', activeQuery);
    console.log('hasMore:', hasMore);
    console.log('defaultStatementsData:', defaultStatementsData);

    if (activeQuery !== '') {
      console.log('Skipping: activeQuery is set');
      return;
    }
    if (!hasMore) {
      console.log('Skipping: no more data');
      return;
    }

    try {
      const currentLength = defaultStatementsData?.statements?.length || 0;
      console.log('Current length:', currentLength);
      console.log('Fetching with offset:', currentLength);

      // Find the first visible item ID before fetching
      const firstVisibleElement = document.querySelector('[data-speech-id]');
      const anchorId = firstVisibleElement?.getAttribute('data-speech-id');
      const scrollY = window.scrollY;
      console.log('Anchor ID before fetch:', anchorId);
      console.log('Scroll position before fetch:', scrollY);

      const result = await fetchMore({
        variables: {
          limit: STATEMENTS_PER_PAGE,
          offset: currentLength,
        },
      });

      console.log('fetchMore result:', result);
      console.log('Result data:', result.data);

      // result.data.statements contains ONLY the new items fetched
      // The Apollo cache merge happens automatically
      // If we got fewer results than requested, we've reached the end
      const itemsFetched = result.data?.statements?.length || 0;
      console.log('Items fetched from server:', itemsFetched);

      // Check the cache data immediately after fetchMore
      console.log('defaultStatementsData after fetchMore:', defaultStatementsData?.statements?.length);

      if (itemsFetched < STATEMENTS_PER_PAGE) {
        console.log('Setting hasMore to false - got fewer items than requested');
        setHasMore(false);
      } else {
        console.log('Fetched full page, might have more data');
      }

      // Scroll back to the anchor element after React re-renders
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (anchorId) {
            const anchorElement = document.querySelector(`[data-speech-id="${anchorId}"]`);
            if (anchorElement) {
              anchorElement.scrollIntoView({ block: 'start', behavior: 'instant' });
              console.log('Scrolled back to anchor:', anchorId);
            } else {
              // Fallback to scroll position
              window.scrollTo(0, scrollY);
              console.log('Anchor not found, restored scroll position to:', scrollY);
            }
          } else {
            window.scrollTo(0, scrollY);
            console.log('No anchor, restored scroll position to:', scrollY);
          }
        });
      });
    } catch (error) {
      console.error('Error loading more statements:', error);
    }
  };

  // Handle copy quote
  const handleCopyQuote = (speech: any) => {
    const quote = `"${speech.content_en}"\n\n— ${speech.who_en}, ${new Date(speech.partOf?.date).toLocaleDateString()}`;
    navigator.clipboard.writeText(quote);
  };

  // Get unique parties from results
  const availableParties = useMemo(() => {
    const parties = new Set<string>();
    hansardData?.searchHansard?.forEach((speech: any) => {
      if (speech.madeBy?.party) parties.add(speech.madeBy.party);
    });
    return Array.from(parties).sort();
  }, [hansardData]);

  // Get unique document types
  const availableDocTypes = useMemo(() => {
    const types = new Set<string>();
    hansardData?.searchHansard?.forEach((speech: any) => {
      if (speech.partOf?.document_type) types.add(speech.partOf.document_type);
    });
    return Array.from(types).sort();
  }, [hansardData]);

  // Stats
  const stats = useMemo(() => {
    const totalWords = filteredResults.reduce((sum, speech) => sum + (speech.wordcount || 0), 0);
    const uniqueSpeakers = new Set(filteredResults.map(s => s.who_en)).size;
    const dateRange = filteredResults.length > 0 ? {
      earliest: Math.min(...filteredResults.map(s => new Date(s.partOf?.date || 0).getTime())),
      latest: Math.max(...filteredResults.map(s => new Date(s.partOf?.date || 0).getTime())),
    } : null;

    return {
      totalSpeeches: filteredResults.length,
      totalWords,
      uniqueSpeakers,
      dateRange
    };
  }, [filteredResults]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 page-container">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <MessageSquare className="h-10 w-10 text-accent-red" />
            <div>
              <h1 className="text-4xl font-bold text-text-primary">{t('title')}</h1>
              <p className="text-text-secondary">{t('subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <Card className="mb-6">
          <div className="space-y-4">
            {/* Main Search */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
                <input
                  type="text"
                  placeholder={t('search.placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2.5 text-lg bg-bg-secondary border border-border-subtle rounded-lg text-text-primary placeholder-text-tertiary focus:border-accent-red focus:outline-none transition-colors"
                />
              </div>
              <Button onClick={handleSearch} disabled={!searchQuery.trim()}>
                {t('search.button')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                {t('search.filters')}
                {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </Button>
              <ThreadToggle
                enabled={threadedViewEnabled}
                onChange={setThreadedViewEnabled}
                size="md"
              />
            </div>

            {/* Example Searches - hidden for now, would need translation */}
            {/* TODO: Add example searches with translation support */}

            {/* Advanced Filters */}
            {showFilters && (
              <div className="pt-4 border-t border-border-subtle space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Party Filter */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      {t('filters.party')}
                    </label>
                    <select
                      value={selectedParty}
                      onChange={(e) => setSelectedParty(e.target.value)}
                      className="w-full px-3 py-2 bg-bg-base border border-border-subtle rounded-lg text-text-primary"
                    >
                      <option value="">{t('filters.allParties')}</option>
                      {availableParties.map(party => (
                        <option key={party} value={party}>{party}</option>
                      ))}
                    </select>
                  </div>

                  {/* MP Filter */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      {t('filters.member')}
                    </label>
                    <select
                      value={selectedMP}
                      onChange={(e) => setSelectedMP(e.target.value)}
                      className="w-full px-3 py-2 bg-bg-base border border-border-subtle rounded-lg text-text-primary"
                    >
                      <option value="">{t('filters.allMPs')}</option>
                      {mpsData?.searchMPs?.map((mp: any) => (
                        <option key={mp.id} value={mp.id}>
                          {mp.name} ({mp.party})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Document Type */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      {t('filters.documentType')}
                    </label>
                    <select
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                      className="w-full px-3 py-2 bg-bg-base border border-border-subtle rounded-lg text-text-primary"
                    >
                      <option value="">{t('filters.allTypes')}</option>
                      {availableDocTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {/* Statement Type */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Statement Type
                    </label>
                    <select
                      value={statementType}
                      onChange={(e) => setStatementType(e.target.value)}
                      className="w-full px-3 py-2 bg-bg-base border border-border-subtle rounded-lg text-text-primary"
                    >
                      <option value="">All Types</option>
                      <option value="interjection">Interjections Only</option>
                      <option value="question">Questions Only</option>
                      <option value="answer">Answers Only</option>
                      <option value="debate">Debates Only</option>
                    </select>
                  </div>

                  {/* Date Range Start */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      {t('filters.dateFrom')}
                    </label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      className="w-full px-3 py-2 bg-bg-secondary border border-border-subtle rounded-lg text-text-primary focus:border-accent-red focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Date Range End */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      {t('filters.dateTo')}
                    </label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      className="w-full px-3 py-2 bg-bg-secondary border border-border-subtle rounded-lg text-text-primary focus:border-accent-red focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Min Word Count */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      {t('filters.minWords')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={minWordCount}
                      onChange={(e) => setMinWordCount(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-bg-secondary border border-border-subtle rounded-lg text-text-primary placeholder-text-tertiary focus:border-accent-red focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Checkbox Filters */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={onlySubstantive}
                      onChange={(e) => setOnlySubstantive(e.target.checked)}
                      className="rounded border-border-subtle"
                    />
                    {t('filters.onlySubstantive')}
                  </label>
                </div>

                {/* Clear Filters */}
                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedParty('');
                      setSelectedMP('');
                      setDateRange({ start: '', end: '' });
                      setMinWordCount(0);
                      setDocumentType('');
                      setStatementType('');
                      setOnlySubstantive(false);
                    }}
                  >
                    {t('filters.clearAll')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Popular Topics */}
        <div className="mb-6">
          {/* TODO: Add popular topics with translation support */}
        </div>

        {/* Search Stats */}
        {!hansardLoading && filteredResults.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="text-center">
              <div className="text-3xl font-bold text-accent-red">{stats.totalSpeeches}</div>
              <div className="text-sm text-text-secondary">{t('results.stats.speeches')}</div>
            </Card>
            <Card className="text-center">
              <div className="text-3xl font-bold text-accent-red">{stats.uniqueSpeakers}</div>
              <div className="text-sm text-text-secondary">{t('results.stats.speakers')}</div>
            </Card>
            <Card className="text-center">
              <div className="text-3xl font-bold text-accent-red">
                {(stats.totalWords / 1000).toFixed(1)}k
              </div>
              <div className="text-sm text-text-secondary">{t('results.stats.words')}</div>
            </Card>
            <Card className="text-center">
              <div className="text-3xl font-bold text-accent-red">
                {stats.dateRange ? Math.ceil((stats.dateRange.latest - stats.dateRange.earliest) / (1000 * 60 * 60 * 24)) : 0}
              </div>
              <div className="text-sm text-text-secondary">{t('results.stats.days')}</div>
            </Card>
          </div>
        )}

        {/* Results */}
        <Card>
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-text-primary">
              {activeQuery ? t('results.title') : t('results.recentDebates')}
              {filteredResults.length > 0 && (
                <span className="text-text-tertiary ml-2">({filteredResults.length})</span>
              )}
            </h2>
            {activeQuery && (
              <p className="text-sm text-text-secondary mt-1">
                {t('results.showingFor')} <span className="font-semibold text-text-primary">"{activeQuery}"</span>
              </p>
            )}
          </div>

          {(isInitialLoading || hansardLoading) ? (
            <Loading />
          ) : filteredResults.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 text-text-tertiary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-text-primary mb-2">{t('results.noResults')}</h3>
              <p className="text-text-secondary mb-4">
                {t('results.tryDifferent')}
              </p>
              <Button onClick={() => handleTopicClick('government')}>
                {t('results.viewRecent')}
              </Button>
            </div>
          ) : threadedViewEnabled ? (
            <ConversationThread
              statements={filteredResults}
              defaultExpanded={false}
            />
          ) : (
            <div className="space-y-4">
              {filteredResults.map((speech: any) => {
                const isExpanded = expandedSpeech === speech.id;
                const bilingualSpeech = useBilingualContent(speech);

                // Use HTML content directly - it's from official government sources
                const content = bilingualSpeech.content || '';
                // For preview, truncate HTML at a reasonable length
                // Note: This is a simple truncation and may cut in the middle of a tag
                // but we'll use full content when expanded
                const preview = content.length > 500 ? content.substring(0, 500) + '...' : content;

                // Get photo URL from GCS or fallback to ID-based construction
                const photoUrl = speech.madeBy ? getMPPhotoUrl(speech.madeBy) : null;

                return (
                  <div
                    key={speech.id}
                    data-speech-id={speech.id}
                    className="p-4 rounded-lg bg-bg-elevated border border-border-subtle hover:border-accent-red/30 transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {photoUrl && (
                          <img
                            src={photoUrl}
                            alt={speech.madeBy.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        )}
                        <div>
                          {speech.madeBy ? (
                            <Link
                              href={`/mps/${speech.madeBy.id}` as any}
                              className="font-semibold text-text-primary hover:text-accent-red transition-colors"
                            >
                              {speech.madeBy.name}
                            </Link>
                          ) : (
                            <span className="font-semibold text-text-primary">
                              {bilingualSpeech.who}
                            </span>
                          )}
                          <div className="flex items-center gap-2 text-sm text-text-secondary">
                            {speech.madeBy?.party && (
                              <span className="font-medium">{speech.madeBy.party}</span>
                            )}
                            {speech.partOf?.date && (() => {
                              // Parse date properly - handle both string dates and timestamps
                              const dateValue = speech.partOf.date;
                              let date: Date;

                              if (typeof dateValue === 'string') {
                                // If it's a string like "2024-10-15", parse it directly
                                date = new Date(dateValue);
                              } else if (typeof dateValue === 'number') {
                                // If it's a number, it's likely a timestamp
                                // Check if it's in seconds (Unix timestamp) or milliseconds
                                date = dateValue > 9999999999 ? new Date(dateValue) : new Date(dateValue * 1000);
                              } else {
                                date = new Date(dateValue);
                              }

                              // Validate the date is reasonable (between 1990 and 2050)
                              const year = date.getFullYear();
                              const isValidDate = !isNaN(date.getTime()) && year >= 1990 && year <= 2050;

                              return isValidDate ? (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {date.toLocaleDateString(locale === 'fr' ? 'fr-CA' : 'en-CA', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </span>
                                </>
                              ) : null;
                            })()}
                            {speech.wordcount && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Hash className="h-3 w-3" />
                                  {speech.wordcount} {locale === 'fr' ? 'mots' : 'words'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCopyQuote(speech)}
                          className="p-2 hover:bg-bg-overlay rounded-lg transition-colors"
                          title={t('results.copyQuote')}
                        >
                          <Copy className="h-4 w-4 text-text-tertiary" />
                        </button>
                      </div>
                    </div>

                    {/* Topic/Context */}
                    {(bilingualSpeech.h1 || bilingualSpeech.h2 || bilingualSpeech.h3) && (
                      <div className="mb-2 space-y-1">
                        {bilingualSpeech.h1 && (
                          <div className="text-sm font-semibold text-accent-red">
                            {bilingualSpeech.h1}
                          </div>
                        )}
                        {bilingualSpeech.h2 && (
                          <div className="text-sm font-medium text-text-primary">
                            {bilingualSpeech.h2}
                          </div>
                        )}
                        {bilingualSpeech.h3 && (
                          <div className="text-sm text-text-secondary">
                            {bilingualSpeech.h3}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Content */}
                    <div className="mb-3">
                      <div className="text-text-primary prose prose-sm max-w-none">
                        {(isExpanded ? content : preview).split('\n\n').map((paragraph: string, idx: number) => (
                          paragraph.trim() && (
                            <p key={idx} className="mb-2 last:mb-0">
                              {paragraph}
                            </p>
                          )
                        ))}
                      </div>
                      {content.length > 500 && (
                        <button
                          onClick={() => setExpandedSpeech(isExpanded ? null : speech.id)}
                          className="text-sm text-accent-red hover:text-accent-red-hover font-medium mt-2"
                        >
                          {isExpanded ? t('results.showLess') : t('results.readMore')}
                        </button>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
                      <div className="flex items-center gap-3 text-xs text-text-tertiary">
                        {speech.statement_type && (
                          <span className="px-2 py-1 bg-bg-overlay rounded">
                            {speech.statement_type}
                          </span>
                        )}
                        {speech.procedural && (
                          <span className="px-2 py-1 bg-bg-overlay rounded text-text-tertiary">
                            {t('results.procedural')}
                          </span>
                        )}
                        {speech.partOf?.document_type && (
                          <span className="px-2 py-1 bg-bg-overlay rounded">
                            {speech.partOf.document_type}
                          </span>
                        )}
                      </div>

                      {speech.partOf?.id && (
                        <Link
                          href={`/debates/${speech.partOf.id}` as any}
                          className="text-sm text-accent-red hover:text-accent-red-hover font-medium flex items-center gap-1"
                        >
                          {t('results.viewFullDebate')}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More Button - only shown in default view */}
          {(() => {
            const shouldShow = !activeQuery && filteredResults.length > 0 && hasMore;
            console.log('Load More button visibility:', {
              activeQuery,
              resultsLength: filteredResults.length,
              hasMore,
              isFetchingMore,
              shouldShow
            });
            return shouldShow && (
              <div className="mt-6 text-center">
                <Button
                  onClick={handleLoadMore}
                  variant="secondary"
                  disabled={isFetchingMore}
                >
                  {isFetchingMore ? t('results.loading') : t('results.loadMore')}
                </Button>
              </div>
            );
          })()}
        </Card>

        {/* Search Tips */}
        <Card className="mt-8 bg-bg-overlay border-accent-red/20">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-accent-red/10 rounded-lg">
              <Sparkles className="h-6 w-6 text-accent-red" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-text-primary mb-2">
                {t('tips.title')}
              </h3>
              <ul className="text-sm text-text-secondary space-y-1">
                {t.raw('tips.items').map((tip: string, index: number) => (
                  <li key={index}>• {tip}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
