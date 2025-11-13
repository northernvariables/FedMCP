'use client';

import { Calendar, MessageSquare, Users, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { DebateWordCloud } from './DebateWordCloud';

interface DebateSummary {
  document: {
    id: string;
    date: string | number;
    session_id: string;
    document_type: string;
    number: number;
    keywords_en?: string;
    keywords_fr?: string;
  };
  statement_count: number;
  speaker_count: number;
  top_topics: string[];
  is_question_period?: boolean;
}

interface DebateCardProps {
  debate: DebateSummary;
}

export function DebateCard({ debate }: DebateCardProps) {
  const locale = useLocale();

  // Format date properly
  const formatDate = (dateValue: string | number) => {
    let date: Date;

    if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    } else if (typeof dateValue === 'number') {
      // Handle both milliseconds and seconds timestamps
      date = dateValue > 9999999999 ? new Date(dateValue) : new Date(dateValue * 1000);
    } else {
      date = new Date(dateValue);
    }

    // Validate date
    const year = date.getFullYear();
    if (isNaN(date.getTime()) || year < 1990 || year > 2050) {
      return 'Invalid Date';
    }

    return date.toLocaleDateString(locale === 'fr' ? 'fr-CA' : 'en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  // Get document type label
  const getDocumentTypeLabel = () => {
    switch (debate.document.document_type) {
      case 'D':
        return locale === 'fr' ? 'Débats de la Chambre' : 'House Debates';
      case 'E':
        return locale === 'fr' ? 'Témoignages de comité' : 'Committee Evidence';
      default:
        return debate.document.document_type;
    }
  };

  // Get document number label
  const getNumberLabel = () => {
    return locale === 'fr' ? `No ${debate.document.number}` : `No. ${debate.document.number}`;
  };

  return (
    <Link
      href={`/${locale}/debates/${debate.document.id}`}
      className="block rounded-lg bg-bg-elevated border border-border-subtle hover:border-accent-red/30 transition-all hover:shadow-md group overflow-hidden"
    >
      {/* Two-column grid: Info left, Word cloud right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
        {/* LEFT COLUMN: Existing Info */}
        <div className="p-6">
          {/* Header: Date and Type */}
          <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold text-text-primary mb-1">
            <Calendar className="h-5 w-5 text-accent-red" />
            {formatDate(debate.document.date)}
          </div>
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <span>{getDocumentTypeLabel()}</span>
            <span>•</span>
            <span>{getNumberLabel()}</span>
            {debate.document.session_id && (
              <>
                <span>•</span>
                <span>{locale === 'fr' ? 'Session' : 'Session'} {debate.document.session_id}</span>
              </>
            )}
          </div>
        </div>

        {debate.is_question_period && (
          <span className="px-3 py-1 bg-accent-red/10 text-accent-red text-xs font-medium rounded-full whitespace-nowrap">
            {locale === 'fr' ? 'Période des questions' : 'Question Period'}
          </span>
        )}
      </div>

      {/* Top Topics */}
      {debate.top_topics && debate.top_topics.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium text-text-tertiary mb-2">
            {locale === 'fr' ? '📋 Principaux sujets :' : '📋 Top Topics:'}
          </div>
          <div className="space-y-1">
            {debate.top_topics.map((topic, idx) => (
              <div
                key={idx}
                className="text-sm text-text-primary font-medium pl-3 border-l-2 border-accent-red/30"
              >
                {topic}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-text-tertiary pt-4 border-t border-border-subtle">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span>
            {debate.statement_count.toLocaleString()}{' '}
            {locale === 'fr' ? (debate.statement_count === 1 ? 'intervention' : 'interventions') : (debate.statement_count === 1 ? 'speech' : 'speeches')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span>
            {debate.speaker_count}{' '}
            {locale === 'fr' ? (debate.speaker_count === 1 ? 'député' : 'députés') : (debate.speaker_count === 1 ? 'MP' : 'MPs')}
          </span>
        </div>
            <div className="ml-auto flex items-center gap-1 text-accent-red font-medium group-hover:gap-2 transition-all">
              {locale === 'fr' ? 'Voir le débat' : 'View Debate'}
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Word Cloud (desktop only) */}
        {(debate.document.keywords_en || debate.document.keywords_fr) && (
          <div className="hidden lg:flex items-center justify-center bg-bg-base/50 p-6 border-l border-border-subtle">
            <DebateWordCloud
              keywords_en={debate.document.keywords_en}
              keywords_fr={debate.document.keywords_fr}
              compact={true}
            />
          </div>
        )}
      </div>
    </Link>
  );
}
