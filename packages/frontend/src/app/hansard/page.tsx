/**
 * Hansard Search Page - Search parliamentary debates and speeches
 */

'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loading } from '@/components/Loading';
import { Card, Button } from '@canadagpt/design-system';
import { SEARCH_HANSARD, SEARCH_MPS } from '@/lib/queries';
import Link from 'next/link';
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

// Popular search topics for quick access
const POPULAR_TOPICS = [
  { label: 'Climate Change', query: 'climate change', icon: '🌍' },
  { label: 'Housing Crisis', query: 'housing affordability', icon: '🏠' },
  { label: 'Healthcare', query: 'healthcare system', icon: '🏥' },
  { label: 'Economy', query: 'economic growth', icon: '💰' },
  { label: 'Immigration', query: 'immigration policy', icon: '🛂' },
  { label: 'Indigenous Rights', query: 'indigenous reconciliation', icon: '🪶' },
  { label: 'Education', query: 'education funding', icon: '📚' },
  { label: 'Environment', query: 'environmental protection', icon: '🌲' },
];

// Example searches to inspire users
const EXAMPLE_SEARCHES = [
  'carbon tax debate',
  'housing affordability crisis',
  'healthcare wait times',
  'small business support',
  'indigenous water rights',
];

export default function HansardPage() {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('government'); // Default search
  const [showFilters, setShowFilters] = useState(false);
  const [expandedSpeech, setExpandedSpeech] = useState<string | null>(null);

  // Filter state
  const [selectedParty, setSelectedParty] = useState<string>('');
  const [selectedMP, setSelectedMP] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [minWordCount, setMinWordCount] = useState<number>(0);
  const [documentType, setDocumentType] = useState<string>('');
  const [onlySubstantive, setOnlySubstantive] = useState(false);

  // Fetch search results
  const { data: hansardData, loading: hansardLoading, refetch } = useQuery(SEARCH_HANSARD, {
    variables: {
      query: activeQuery,
      limit: 100,
      language: 'en'
    },
  });

  // Fetch MPs for autocomplete
  const { data: mpsData } = useQuery(SEARCH_MPS, {
    variables: { current: true, limit: 500 },
  });

  // Filter results based on advanced filters
  const filteredResults = useMemo(() => {
    if (!hansardData?.searchHansard) return [];

    let results = [...hansardData.searchHansard];

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

    // Procedural filter
    if (onlySubstantive) {
      results = results.filter(speech => !speech.procedural);
    }

    return results;
  }, [hansardData, selectedParty, selectedMP, dateRange, minWordCount, documentType, onlySubstantive]);

  // Handle search
  const handleSearch = () => {
    if (searchQuery.trim()) {
      setActiveQuery(searchQuery);
    }
  };

  // Handle popular topic click
  const handleTopicClick = (query: string) => {
    setSearchQuery(query);
    setActiveQuery(query);
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
              <h1 className="text-4xl font-bold text-text-primary">Hansard Search</h1>
              <p className="text-text-secondary">Search parliamentary debates and speeches</p>
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
                  placeholder="Search debates by keyword, topic, or phrase..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2.5 text-lg bg-bg-secondary border border-border-subtle rounded-lg text-text-primary placeholder-text-tertiary focus:border-accent-red focus:outline-none transition-colors"
                />
              </div>
              <Button onClick={handleSearch} disabled={!searchQuery.trim()}>
                Search
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </Button>
            </div>

            {/* Example Searches */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-text-tertiary">Try:</span>
              {EXAMPLE_SEARCHES.map((example) => (
                <button
                  key={example}
                  onClick={() => handleTopicClick(example)}
                  className="text-accent-red hover:text-accent-red-hover hover:underline"
                >
                  {example}
                </button>
              ))}
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="pt-4 border-t border-border-subtle space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Party Filter */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Political Party
                    </label>
                    <select
                      value={selectedParty}
                      onChange={(e) => setSelectedParty(e.target.value)}
                      className="w-full px-3 py-2 bg-bg-base border border-border-subtle rounded-lg text-text-primary"
                    >
                      <option value="">All Parties</option>
                      {availableParties.map(party => (
                        <option key={party} value={party}>{party}</option>
                      ))}
                    </select>
                  </div>

                  {/* MP Filter */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Member of Parliament
                    </label>
                    <select
                      value={selectedMP}
                      onChange={(e) => setSelectedMP(e.target.value)}
                      className="w-full px-3 py-2 bg-bg-base border border-border-subtle rounded-lg text-text-primary"
                    >
                      <option value="">All MPs</option>
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
                      Document Type
                    </label>
                    <select
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                      className="w-full px-3 py-2 bg-bg-base border border-border-subtle rounded-lg text-text-primary"
                    >
                      <option value="">All Types</option>
                      {availableDocTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date Range Start */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      From Date
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
                      To Date
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
                      Min Words (substantive speeches)
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
                    Only substantive speeches (exclude procedural remarks)
                  </label>
                </div>

                {/* Clear Filters */}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedParty('');
                      setSelectedMP('');
                      setDateRange({ start: '', end: '' });
                      setMinWordCount(0);
                      setDocumentType('');
                      setOnlySubstantive(false);
                    }}
                  >
                    Clear All Filters
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Popular Topics */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-accent-red" />
            <h2 className="text-lg font-semibold text-text-primary">Popular Topics</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {POPULAR_TOPICS.map((topic) => (
              <button
                key={topic.query}
                onClick={() => handleTopicClick(topic.query)}
                className="px-4 py-2 bg-bg-elevated hover:bg-bg-overlay border border-border-subtle rounded-full text-sm font-medium text-text-primary transition-colors flex items-center gap-2"
              >
                <span>{topic.icon}</span>
                {topic.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Stats */}
        {!hansardLoading && filteredResults.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="text-center">
              <div className="text-3xl font-bold text-accent-red">{stats.totalSpeeches}</div>
              <div className="text-sm text-text-secondary">Speeches Found</div>
            </Card>
            <Card className="text-center">
              <div className="text-3xl font-bold text-accent-red">{stats.uniqueSpeakers}</div>
              <div className="text-sm text-text-secondary">Unique Speakers</div>
            </Card>
            <Card className="text-center">
              <div className="text-3xl font-bold text-accent-red">
                {(stats.totalWords / 1000).toFixed(1)}k
              </div>
              <div className="text-sm text-text-secondary">Total Words</div>
            </Card>
            <Card className="text-center">
              <div className="text-3xl font-bold text-accent-red">
                {stats.dateRange ? Math.ceil((stats.dateRange.latest - stats.dateRange.earliest) / (1000 * 60 * 60 * 24)) : 0}
              </div>
              <div className="text-sm text-text-secondary">Days Covered</div>
            </Card>
          </div>
        )}

        {/* Results */}
        <Card>
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-text-primary">
              Search Results
              {filteredResults.length > 0 && (
                <span className="text-text-tertiary ml-2">({filteredResults.length})</span>
              )}
            </h2>
            {activeQuery && (
              <p className="text-sm text-text-secondary mt-1">
                Showing results for: <span className="font-semibold text-text-primary">"{activeQuery}"</span>
              </p>
            )}
          </div>

          {hansardLoading ? (
            <Loading />
          ) : filteredResults.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 text-text-tertiary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-text-primary mb-2">No speeches found</h3>
              <p className="text-text-secondary mb-4">
                Try adjusting your search query or filters
              </p>
              <Button onClick={() => handleTopicClick('government')}>
                View Recent Debates
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredResults.map((speech: any) => {
                const isExpanded = expandedSpeech === speech.id;
                const content = speech.content_en || '';
                const preview = content.length > 300 ? content.substring(0, 300) + '...' : content;

                return (
                  <div
                    key={speech.id}
                    className="p-4 rounded-lg bg-bg-elevated border border-border-subtle hover:border-accent-red/30 transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {speech.madeBy?.photo_url && (
                          <img
                            src={speech.madeBy.photo_url}
                            alt={speech.madeBy.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        )}
                        <div>
                          {speech.madeBy ? (
                            <Link
                              href={`/mps/${speech.madeBy.id}`}
                              className="font-semibold text-text-primary hover:text-accent-red transition-colors"
                            >
                              {speech.madeBy.name}
                            </Link>
                          ) : (
                            <span className="font-semibold text-text-primary">
                              {speech.who_en}
                            </span>
                          )}
                          <div className="flex items-center gap-2 text-sm text-text-secondary">
                            {speech.madeBy?.party && (
                              <span className="font-medium">{speech.madeBy.party}</span>
                            )}
                            {speech.partOf?.date && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(speech.partOf.date).toLocaleDateString('en-CA', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </span>
                              </>
                            )}
                            {speech.wordcount && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Hash className="h-3 w-3" />
                                  {speech.wordcount} words
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
                          title="Copy quote"
                        >
                          <Copy className="h-4 w-4 text-text-tertiary" />
                        </button>
                      </div>
                    </div>

                    {/* Topic/Context */}
                    {(speech.h1_en || speech.h2_en || speech.h3_en) && (
                      <div className="mb-2 space-y-1">
                        {speech.h1_en && (
                          <div className="text-sm font-semibold text-accent-red">
                            {speech.h1_en}
                          </div>
                        )}
                        {speech.h2_en && (
                          <div className="text-sm font-medium text-text-primary">
                            {speech.h2_en}
                          </div>
                        )}
                        {speech.h3_en && (
                          <div className="text-sm text-text-secondary">
                            {speech.h3_en}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Content */}
                    <div className="mb-3">
                      <p className="text-text-primary whitespace-pre-line">
                        {isExpanded ? content : preview}
                      </p>
                      {content.length > 300 && (
                        <button
                          onClick={() => setExpandedSpeech(isExpanded ? null : speech.id)}
                          className="text-sm text-accent-red hover:text-accent-red-hover font-medium mt-2"
                        >
                          {isExpanded ? 'Show less' : 'Read more'}
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
                            Procedural
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
                          href={`/debates/${speech.partOf.id}`}
                          className="text-sm text-accent-red hover:text-accent-red-hover font-medium flex items-center gap-1"
                        >
                          View Full Debate
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Search Tips */}
        <Card className="mt-8 bg-bg-overlay border-accent-red/20">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-accent-red/10 rounded-lg">
              <Sparkles className="h-6 w-6 text-accent-red" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-text-primary mb-2">
                Search Tips
              </h3>
              <ul className="text-sm text-text-secondary space-y-1">
                <li>• Use specific keywords for better results (e.g., "carbon pricing" vs "environment")</li>
                <li>• Try multiple related terms if you don't find what you're looking for</li>
                <li>• Use filters to narrow down by party, MP, or date range</li>
                <li>• Set minimum word count to find substantial speeches vs short remarks</li>
                <li>• Filter out procedural remarks to focus on policy discussions</li>
                <li>• Click on speaker names to see their full parliamentary profile</li>
              </ul>
            </div>
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
