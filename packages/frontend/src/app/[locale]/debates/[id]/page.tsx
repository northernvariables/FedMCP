/**
 * Debate Document Viewer - View full Hansard debates and speeches
 */

'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { useParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loading } from '@/components/Loading';
import { Card, Button } from '@canadagpt/design-system';
import { GET_HANSARD_DOCUMENT, GET_RECENT_DEBATES } from '@/lib/queries';
import Link from 'next/link';
import { getMPPhotoUrl } from '@/lib/utils/mpPhotoUrl';
import {
  Calendar,
  FileText,
  Users,
  Search,
  Copy,
  Share2,
  ChevronRight,
  MessageSquare,
  Filter,
  Hash,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BookOpen,
  List
} from 'lucide-react';
import { usePageThreading } from '@/contexts/UserPreferencesContext';
import { ThreadToggle, ConversationThread } from '@/components/hansard';

interface Statement {
  id: string;
  time?: string;
  who_en: string;
  content_en: string;
  h1_en?: string;
  h2_en?: string;
  h3_en?: string;
  statement_type?: string;
  wordcount?: number;
  procedural?: boolean;
  thread_id?: string;
  parent_statement_id?: string;
  sequence_in_thread?: number;
  madeBy?: {
    id: string;
    name: string;
    party: string;
    photo_url?: string;
  };
}

export default function DebatePage() {
  const params = useParams();
  const debateId = params.id as string;

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [showTOC, setShowTOC] = useState(true);
  const [highlightedSpeech, setHighlightedSpeech] = useState<string | null>(null);

  // Threading state
  const { enabled: threadedViewEnabled, setEnabled: setThreadedViewEnabled } = usePageThreading();

  // Refs for scrolling
  const speechRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Fetch debate documents (all recent ones, filter client-side due to GraphQL where clause issues)
  const { data, loading, error } = useQuery(GET_HANSARD_DOCUMENT);

  // Fetch recent debates for error state
  const { data: recentDebatesData } = useQuery(GET_RECENT_DEBATES, {
    variables: { limit: 10 },
  });

  // Filter to find the specific document by ID
  const document = data?.documents?.find((doc: any) => doc.id === debateId);
  const statements = document?.statements || [];
  const recentDebates = recentDebatesData?.documents || [];

  // Filter statements
  const filteredStatements = useMemo(() => {
    let filtered = [...statements];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((stmt: Statement) =>
        stmt.content_en?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stmt.who_en?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stmt.h2_en?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Speaker filter
    if (selectedSpeaker) {
      filtered = filtered.filter((stmt: Statement) => stmt.madeBy?.id === selectedSpeaker);
    }

    // Topic filter
    if (selectedTopic) {
      filtered = filtered.filter((stmt: Statement) => stmt.h2_en === selectedTopic);
    }

    return filtered;
  }, [statements, searchQuery, selectedSpeaker, selectedTopic]);

  // Get unique speakers
  const speakers = useMemo(() => {
    const speakerMap = new Map<string, { id: string; name: string; party: string; count: number }>();
    statements.forEach((stmt: Statement) => {
      if (stmt.madeBy) {
        const existing = speakerMap.get(stmt.madeBy.id);
        if (existing) {
          existing.count++;
        } else {
          speakerMap.set(stmt.madeBy.id, {
            id: stmt.madeBy.id,
            name: stmt.madeBy.name,
            party: stmt.madeBy.party,
            count: 1
          });
        }
      }
    });
    return Array.from(speakerMap.values()).sort((a, b) => b.count - a.count);
  }, [statements]);

  // Get topics (h2_en values)
  const topics = useMemo(() => {
    const topicMap = new Map<string, number>();
    statements.forEach((stmt: Statement) => {
      if (stmt.h2_en) {
        topicMap.set(stmt.h2_en, (topicMap.get(stmt.h2_en) || 0) + 1);
      }
    });
    return Array.from(topicMap.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);
  }, [statements]);

  // Table of Contents - group by h2
  const tableOfContents = useMemo(() => {
    const toc: { topic: string; statements: Statement[] }[] = [];
    let currentTopic = '';
    let currentStatements: Statement[] = [];

    statements.forEach((stmt: Statement) => {
      if (stmt.h2_en && stmt.h2_en !== currentTopic) {
        if (currentStatements.length > 0) {
          toc.push({ topic: currentTopic, statements: currentStatements });
        }
        currentTopic = stmt.h2_en;
        currentStatements = [stmt];
      } else {
        currentStatements.push(stmt);
      }
    });

    if (currentStatements.length > 0) {
      toc.push({ topic: currentTopic || 'Opening Remarks', statements: currentStatements });
    }

    return toc;
  }, [statements]);

  // Scroll to speech
  const scrollToSpeech = (speechId: string) => {
    const element = speechRefs.current[speechId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedSpeech(speechId);
      setTimeout(() => setHighlightedSpeech(null), 3000);
    }
  };

  // Copy debate link
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  // Stats
  const stats = useMemo(() => {
    const totalWords = statements.reduce((sum: number, stmt: Statement) => sum + (stmt.wordcount || 0), 0);
    const uniqueSpeakers = new Set(statements.map((s: Statement) => s.who_en)).size;

    return {
      totalSpeeches: statements.length,
      totalWords,
      uniqueSpeakers,
    };
  }, [statements]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 page-container">
          <Loading />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || (!loading && !document)) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 page-container">
          <Card className="text-center py-12 mb-8">
            <FileText className="h-16 w-16 text-text-tertiary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-text-primary mb-2">Debate Not Found</h2>
            <p className="text-text-secondary mb-4">
              The debate document with ID "{debateId}" doesn't exist or couldn't be loaded.
            </p>
            <Link href="/hansard">
              <Button>Search Hansard</Button>
            </Link>
          </Card>

          {/* Show recent debates */}
          {recentDebates.length > 0 && (
            <Card>
              <h3 className="text-xl font-bold text-text-primary mb-4">Recent Debates</h3>
              <div className="space-y-3">
                {recentDebates.map((debate: any) => (
                  <Link
                    key={debate.id}
                    href={`/debates/${debate.id}`}
                    className="block p-4 rounded-lg bg-bg-elevated hover:bg-bg-overlay border border-border-subtle hover:border-accent-red/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-text-primary">
                          Debate #{debate.number}
                        </div>
                        <div className="text-sm text-text-secondary">
                          {new Date(debate.date).toLocaleDateString('en-CA', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                      {debate.statementsAggregate?.count && (
                        <div className="text-sm text-text-tertiary">
                          {debate.statementsAggregate.count} speeches
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 page-container">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-text-tertiary mb-2">
            <Link href="/hansard" className="hover:text-accent-red transition-colors">
              Hansard Search
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span>Debate {document.number || debateId}</span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-text-primary mb-2">
                {document.document_type || 'Parliamentary Debate'}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-text-secondary">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(document.date).toLocaleDateString('en-CA', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                {document.session_id && (
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Session {document.session_id}
                  </div>
                )}
                {document.number && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    No. {document.number}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <ThreadToggle
                enabled={threadedViewEnabled}
                onChange={setThreadedViewEnabled}
                size="sm"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              {document.xml_source_url && (
                <a href={document.xml_source_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    XML Source
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="text-center">
            <div className="text-2xl font-bold text-accent-red">{stats.totalSpeeches}</div>
            <div className="text-sm text-text-secondary">Speeches</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-accent-red">{stats.uniqueSpeakers}</div>
            <div className="text-sm text-text-secondary">Speakers</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-accent-red">
              {(stats.totalWords / 1000).toFixed(1)}k
            </div>
            <div className="text-sm text-text-secondary">Words</div>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
              <input
                type="text"
                placeholder="Search within this debate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border-subtle rounded-lg text-text-primary placeholder-text-tertiary focus:border-accent-red focus:outline-none transition-colors"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Speaker Filter */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Filter by Speaker
                </label>
                <select
                  value={selectedSpeaker}
                  onChange={(e) => setSelectedSpeaker(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-base border border-border-subtle rounded-lg text-text-primary"
                >
                  <option value="">All Speakers ({speakers.length})</option>
                  {speakers.map(speaker => (
                    <option key={speaker.id} value={speaker.id}>
                      {speaker.name} ({speaker.party}) - {speaker.count} speeches
                    </option>
                  ))}
                </select>
              </div>

              {/* Topic Filter */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Filter by Topic
                </label>
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-base border border-border-subtle rounded-lg text-text-primary"
                >
                  <option value="">All Topics ({topics.length})</option>
                  {topics.map(({ topic, count }) => (
                    <option key={topic} value={topic}>
                      {topic} - {count} speeches
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            {(searchQuery || selectedSpeaker || selectedTopic) && (
              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSpeaker('');
                    setSelectedTopic('');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Table of Contents - Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <button
                onClick={() => setShowTOC(!showTOC)}
                className="flex items-center justify-between w-full mb-3"
              >
                <div className="flex items-center gap-2">
                  <List className="h-5 w-5 text-accent-red" />
                  <h2 className="font-bold text-text-primary">Topics</h2>
                </div>
                {showTOC ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showTOC && (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {tableOfContents.map((section, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedTopic(section.topic);
                        if (section.statements[0]) {
                          scrollToSpeech(section.statements[0].id);
                        }
                      }}
                      className="w-full text-left p-2 rounded-lg hover:bg-bg-elevated transition-colors text-sm"
                    >
                      <div className="font-medium text-text-primary line-clamp-2">
                        {section.topic}
                      </div>
                      <div className="text-xs text-text-tertiary mt-1">
                        {section.statements.length} speeches
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Speeches */}
          <div className="lg:col-span-3 space-y-4">
            {filteredStatements.length === 0 ? (
              <Card className="text-center py-12">
                <Search className="h-16 w-16 text-text-tertiary mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-text-primary mb-2">No speeches found</h3>
                <p className="text-text-secondary">Try adjusting your search or filters</p>
              </Card>
            ) : threadedViewEnabled ? (
              <ConversationThread
                statements={filteredStatements}
                defaultExpanded={false}
              />
            ) : (
              filteredStatements.map((statement: Statement) => {
                // Get photo URL from GCS or fallback to ID-based construction
                const photoUrl = statement.madeBy ? getMPPhotoUrl(statement.madeBy) : null;

                return (
                  <div
                    key={statement.id}
                    ref={(el) => { speechRefs.current[statement.id] = el; }}
                    className={`rounded-lg border transition-all ${
                      highlightedSpeech === statement.id
                        ? 'border-accent-red bg-accent-red/5'
                        : 'border-border-subtle bg-bg-elevated'
                    }`}
                  >
                    <div className="p-5">
                      {/* Topic Header (if changed) */}
                      {statement.h2_en && (
                        <div className="mb-3 pb-3 border-b border-border-subtle">
                          {statement.h1_en && (
                            <div className="text-xs font-semibold text-accent-red uppercase mb-1">
                              {statement.h1_en}
                            </div>
                          )}
                          <div className="font-bold text-lg text-text-primary">
                            {statement.h2_en}
                          </div>
                          {statement.h3_en && (
                            <div className="text-sm text-text-secondary mt-1">
                              {statement.h3_en}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Speaker Info */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {photoUrl && statement.madeBy && (
                            <img
                              src={photoUrl}
                              alt={statement.madeBy.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          )}
                        <div>
                          {statement.madeBy ? (
                            <Link
                              href={`/mps/${statement.madeBy.id}`}
                              className="font-semibold text-text-primary hover:text-accent-red transition-colors"
                            >
                              {statement.madeBy.name}
                            </Link>
                          ) : (
                            <span className="font-semibold text-text-primary">
                              {statement.who_en}
                            </span>
                          )}
                          <div className="flex items-center gap-2 text-sm text-text-secondary">
                            {statement.madeBy?.party && (
                              <span>{statement.madeBy.party}</span>
                            )}
                            {statement.time && (
                              <>
                                <span>•</span>
                                <span>{statement.time}</span>
                              </>
                            )}
                            {statement.wordcount && (
                              <>
                                <span>•</span>
                                <span>{statement.wordcount} words</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Copy button */}
                      <button
                        onClick={() => {
                          const quote = `"${statement.content_en}"\n\n— ${statement.who_en}, ${new Date(document.date).toLocaleDateString()}`;
                          navigator.clipboard.writeText(quote);
                        }}
                        className="p-2 hover:bg-bg-overlay rounded-lg transition-colors"
                        title="Copy quote"
                      >
                        <Copy className="h-4 w-4 text-text-tertiary" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="prose prose-invert max-w-none">
                      <p className="text-text-primary whitespace-pre-line leading-relaxed">
                        {statement.content_en}
                      </p>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-subtle">
                      {statement.statement_type && (
                        <span className="px-2 py-1 bg-bg-overlay rounded text-xs text-text-tertiary">
                          {statement.statement_type}
                        </span>
                      )}
                      {statement.procedural && (
                        <span className="px-2 py-1 bg-bg-overlay rounded text-xs text-text-tertiary">
                          Procedural
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
