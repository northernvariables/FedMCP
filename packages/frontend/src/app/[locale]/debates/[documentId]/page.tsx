'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { GET_DEBATE_WITH_STATEMENTS } from '@/lib/queries';
import { DebateContextCard } from '@/components/debates/DebateContextCard';
import { StatementCard } from '@/components/debates/StatementCard';
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
              return (
                <StatementCard
                  key={thread.root.id || idx}
                  statement={thread.root}
                  documentId={documentId}
                />
              );
            }
          })}
        </div>
      </div>
    </div>
  );
}
