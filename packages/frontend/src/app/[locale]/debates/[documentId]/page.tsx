'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { GET_DEBATE_WITH_STATEMENTS } from '@/lib/queries';
import { DebateContextCard } from '@/components/debates/DebateContextCard';
import { SectionNavigator } from '@/components/debates/SectionNavigator';
import { ThreadToggle } from '@/components/hansard/ThreadToggle';
import { ConversationThread } from '@/components/hansard/ConversationThread';
import { Calendar, Copy, Hash } from 'lucide-react';

export default function DebateDetailPage() {
  const params = useParams();
  const locale = useLocale();
  const documentId = params.documentId as string;

  // State
  const [showThreaded, setShowThreaded] = useState(true);
  const [expandedSpeech, setExpandedSpeech] = useState<string | null>(null);

  // Query
  const { data, loading, error } = useQuery(GET_DEBATE_WITH_STATEMENTS, {
    variables: {
      documentId,
      includeThreading: true
    }
  });

  const debateDetail = data?.debateWithStatements;

  // Memoize sections (unique h1 values)
  const sections = useMemo(() => {
    if (!debateDetail?.sections) return [];
    return debateDetail.sections.filter((s: string) => s);
  }, [debateDetail]);

  // Count unique speakers
  const speakerCount = useMemo(() => {
    if (!debateDetail?.statements) return 0;
    const uniquePoliticians = new Set(
      debateDetail.statements
        .map((s: any) => s.politician_id)
        .filter((id: any) => id)
    );
    return uniquePoliticians.size;
  }, [debateDetail]);

  // Group statements by thread if threading is enabled
  const groupedStatements = useMemo(() => {
    if (!debateDetail?.statements) return [];

    const statements = debateDetail.statements;

    if (!showThreaded) {
      // Linear view: just return statements as-is
      return statements.map((s: any) => ({ root: s, replies: [] }));
    }

    // Threaded view: group by thread_id
    const threads = new Map<string, any[]>();
    const orphans: any[] = [];

    statements.forEach((statement: any) => {
      if (statement.thread_id) {
        if (!threads.has(statement.thread_id)) {
          threads.set(statement.thread_id, []);
        }
        threads.get(statement.thread_id)!.push(statement);
      } else {
        // Statements without thread_id
        orphans.push(statement);
      }
    });

    // Convert threads to root + replies structure
    const result: any[] = [];

    // Add threaded statements
    threads.forEach((threadStatements) => {
      // Sort by sequence_in_thread
      threadStatements.sort((a, b) => (a.sequence_in_thread || 0) - (b.sequence_in_thread || 0));

      const root = threadStatements[0];
      const replies = threadStatements.slice(1);

      result.push({ root, replies });
    });

    // Add orphans as single-statement threads
    orphans.forEach((statement) => {
      result.push({ root: statement, replies: [] });
    });

    // Sort by time
    result.sort((a, b) => {
      const timeA = new Date(a.root.time).getTime();
      const timeB = new Date(b.root.time).getTime();
      return timeA - timeB;
    });

    return result;
  }, [debateDetail, showThreaded]);

  // Handle copy quote
  const handleCopyQuote = (statement: any) => {
    const content = locale === 'fr' ? statement.content_fr : statement.content_en;
    const who = locale === 'fr' ? statement.who_fr : statement.who_en;
    const date = new Date(debateDetail.document.date).toLocaleDateString();
    const quote = `"${content}"\n\n— ${who}, ${date}`;
    navigator.clipboard.writeText(quote);
  };

  // Render statement card
  const renderStatement = (statement: any, isReply: boolean = false) => {
    const bilingualStatement = {
      content: locale === 'fr' ? statement.content_fr : statement.content_en,
      who: locale === 'fr' ? statement.who_fr : statement.who_en,
      h1: locale === 'fr' ? statement.h1_fr : statement.h1_en,
      h2: locale === 'fr' ? statement.h2_fr : statement.h2_en,
      h3: locale === 'fr' ? statement.h3_fr : statement.h3_en
    };

    const content = bilingualStatement.content || '';
    const isExpanded = expandedSpeech === statement.id;
    const preview = content.length > 500 ? content.substring(0, 500) + '...' : content;

    return (
      <div
        key={statement.id}
        data-section={bilingualStatement.h1}
        className={`p-4 rounded-lg bg-bg-elevated border border-border-subtle ${
          isReply ? 'ml-8 border-l-4' : ''
        }`}
        style={
          isReply
            ? {
                borderLeftColor: getPartyColor(statement),
              }
            : undefined
        }
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="font-semibold text-text-primary">
                {bilingualStatement.who}
              </div>
              <div className="flex items-center gap-2 text-sm text-text-tertiary flex-wrap">
                {statement.time && (() => {
                  const date = new Date(statement.time);
                  const year = date.getFullYear();
                  const isValidDate = !isNaN(date.getTime()) && year >= 1990 && year <= 2050;

                  return isValidDate ? (
                    <>
                      <Calendar className="h-3 w-3" />
                      <span>
                        {date.toLocaleString(locale === 'fr' ? 'fr-CA' : 'en-CA', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </span>
                    </>
                  ) : null;
                })()}
                {statement.wordcount && (
                  <>
                    <span>•</span>
                    <Hash className="h-3 w-3" />
                    <span>
                      {statement.wordcount} {locale === 'fr' ? 'mots' : 'words'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Copy button */}
          <button
            onClick={() => handleCopyQuote(statement)}
            className="p-2 hover:bg-bg-overlay rounded-lg transition-colors"
            title={locale === 'fr' ? 'Copier la citation' : 'Copy quote'}
          >
            <Copy className="h-4 w-4 text-text-tertiary" />
          </button>
        </div>

        {/* Topic breadcrumb */}
        {(bilingualStatement.h1 || bilingualStatement.h2 || bilingualStatement.h3) && !isReply && (
          <div className="mb-2 space-y-1">
            {bilingualStatement.h1 && (
              <div className="text-sm font-semibold text-accent-red">
                {bilingualStatement.h1}
              </div>
            )}
            {bilingualStatement.h2 && (
              <div className="text-sm font-medium text-text-primary">
                {bilingualStatement.h2}
              </div>
            )}
            {bilingualStatement.h3 && (
              <div className="text-sm text-text-secondary">
                {bilingualStatement.h3}
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
              onClick={() => setExpandedSpeech(isExpanded ? null : statement.id)}
              className="text-sm text-accent-red hover:text-accent-red-hover font-medium mt-2"
            >
              {isExpanded
                ? locale === 'fr'
                  ? 'Afficher moins'
                  : 'Show less'
                : locale === 'fr'
                ? 'Lire la suite'
                : 'Read more'}
            </button>
          )}
        </div>

        {/* Footer badges */}
        {(statement.statement_type || statement.procedural) && (
          <div className="flex items-center gap-2 pt-3 border-t border-border-subtle">
            {statement.statement_type && (
              <span className="px-2 py-1 bg-bg-overlay rounded text-xs text-text-tertiary">
                {statement.statement_type}
              </span>
            )}
            {statement.procedural && (
              <span className="px-2 py-1 bg-bg-overlay rounded text-xs text-text-tertiary">
                {locale === 'fr' ? 'Procédural' : 'Procedural'}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  // Get party color for border
  const getPartyColor = (statement: any) => {
    // This is a simplified version - you'd extract party from who_en/who_fr
    // or ideally have it as a separate field
    return '#D71920'; // Default to Liberal red
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent-red"></div>
          <p className="mt-4 text-text-secondary">
            {locale === 'fr' ? 'Chargement du débat...' : 'Loading debate...'}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !debateDetail) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="bg-bg-elevated border border-border-subtle rounded-lg p-8 max-w-md text-center">
          <p className="text-lg text-text-primary mb-2">
            {locale === 'fr' ? 'Débat introuvable' : 'Debate not found'}
          </p>
          <p className="text-sm text-text-tertiary">
            {error?.message || (locale === 'fr' ? 'Le débat demandé n\'existe pas.' : 'The requested debate does not exist.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Context Card */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <DebateContextCard
          document={debateDetail.document}
          statementCount={debateDetail.statement_count}
          speakerCount={speakerCount}
        />
      </div>

      {/* Section Navigator */}
      {sections.length > 0 && (
        <SectionNavigator sections={sections} locale={locale} />
      )}

      {/* Thread Toggle */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <ThreadToggle enabled={showThreaded} onChange={setShowThreaded} />
      </div>

      {/* Statements */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="space-y-4">
          {groupedStatements.map((thread: any, idx: number) => {
            if (showThreaded && thread.replies.length > 0) {
              return (
                <ConversationThread
                  key={thread.root.id || idx}
                  statements={[thread.root, ...thread.replies]}
                />
              );
            } else {
              return renderStatement(thread.root);
            }
          })}
        </div>
      </div>
    </div>
  );
}
