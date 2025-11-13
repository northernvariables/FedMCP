/**
 * StatementCard Component
 *
 * Displays a single statement in a debate with party-colored styling,
 * MP photos, and action buttons (bookmark, share).
 */

'use client';

import { useState } from 'react';
import { User } from 'lucide-react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { BookmarkButton } from '@/components/bookmarks/BookmarkButton';
import { ShareButton } from '@/components/ShareButton';
import { getMPPhotoUrl } from '@/lib/utils/mpPhotoUrl';
import { processHansardLinks } from '@/lib/utils/hansardLinkProcessor';
import { detectMotionOutcome, getMotionBadgeColors } from '@/lib/utils/motionDetector';

interface Statement {
  id: string;
  time?: string | null;
  who_en?: string | null;
  who_fr?: string | null;
  content_en?: string | null;
  content_fr?: string | null;
  h1_en?: string | null;
  h1_fr?: string | null;
  h2_en?: string | null;
  h2_fr?: string | null;
  h3_en?: string | null;
  h3_fr?: string | null;
  statement_type?: string | null;
  wordcount?: number | null;
  procedural?: boolean | null;
  thread_id?: string | null;
  parent_statement_id?: string | null;
  sequence_in_thread?: number | null;
  madeBy?: {
    id: string;
    name: string;
    party?: string | null;
    photo_url?: string | null;
  } | null;
  partOf?: {
    id: string;
    date: string;
    document_type: string;
  } | null;
}

interface StatementCardProps {
  statement: Statement;
  documentId: string;
  isReply?: boolean;
}

// Neutral color mapping (for Speaker of the House)
const getNeutralColors = () => {
  return {
    bg: 'bg-gray-50/80 dark:bg-gray-900/30',
    border: 'border-gray-300 dark:border-gray-700',
    badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  };
};

// Party color mapping
const getPartyColors = (party: string) => {
  const partyLower = party?.toLowerCase() || '';

  if (partyLower.includes('liberal')) {
    return {
      bg: 'bg-red-50/80 dark:bg-red-950/30',
      border: 'border-red-400 dark:border-red-700',
      badge: 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200',
    };
  }
  if (partyLower.includes('conservative')) {
    return {
      bg: 'bg-blue-50/80 dark:bg-blue-950/30',
      border: 'border-blue-400 dark:border-blue-700',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200',
    };
  }
  if (partyLower.includes('ndp') || partyLower.includes('new democratic')) {
    return {
      bg: 'bg-orange-50/80 dark:bg-orange-950/30',
      border: 'border-orange-400 dark:border-orange-700',
      badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200',
    };
  }
  if (partyLower.includes('bloc')) {
    return {
      bg: 'bg-cyan-50/80 dark:bg-cyan-950/30',
      border: 'border-cyan-400 dark:border-cyan-700',
      badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-200',
    };
  }
  if (partyLower.includes('green')) {
    return {
      bg: 'bg-green-50/80 dark:bg-green-950/30',
      border: 'border-green-400 dark:border-green-700',
      badge: 'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200',
    };
  }

  // Default/Independent
  return {
    bg: 'bg-gray-50/80 dark:bg-gray-950/30',
    border: 'border-gray-400 dark:border-gray-600',
    badge: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  };
};

// Statement type badge
const getStatementTypeBadge = (type?: string | null) => {
  switch (type?.toLowerCase()) {
    case 'question':
      return { label: 'Question', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200' };
    case 'answer':
      return { label: 'Answer', color: 'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200' };
    case 'interjection':
      return { label: 'Interjection', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-200' };
    default:
      return null;
  }
};

export function StatementCard({ statement, documentId, isReply = false }: StatementCardProps) {
  const locale = useLocale();
  const [imageError, setImageError] = useState(false);

  // Get bilingual content
  const who = locale === 'fr' && statement.who_fr ? statement.who_fr : statement.who_en;
  const content = locale === 'fr' && statement.content_fr ? statement.content_fr : statement.content_en;
  const h1 = locale === 'fr' && statement.h1_fr ? statement.h1_fr : statement.h1_en;
  const h2 = locale === 'fr' && statement.h2_fr ? statement.h2_fr : statement.h2_en;
  const h3 = locale === 'fr' && statement.h3_fr ? statement.h3_fr : statement.h3_en;

  // Get MP photo - prioritize GCS URL from getMPPhotoUrl
  // Only use photo_url if it's a full URL (starts with http)
  const photoUrl = statement.madeBy?.id
    ? getMPPhotoUrl(statement.madeBy)
    : (statement.madeBy?.photo_url?.startsWith('http') ? statement.madeBy.photo_url : null);

  // Check if this is the Speaker of the House
  const isSpeaker = who?.toLowerCase().includes('speaker') ||
                    statement.madeBy?.name?.toLowerCase().includes('speaker');

  // Use neutral colors for Speaker, party colors otherwise
  const party = statement.madeBy?.party || '';
  const colors = isSpeaker ? getNeutralColors() : getPartyColors(party);

  // Share data
  const shareUrl = `/${locale}/debates/${documentId}#${statement.id}`;
  const shareTitle = `${who || 'Statement'} - Debate ${documentId}`;
  const shareDescription = content?.substring(0, 150) || 'Parliamentary statement';

  // Bookmark data
  const bookmarkData = {
    itemType: 'statement' as const,
    itemId: statement.id,
    title: shareTitle,
    subtitle: content?.substring(0, 100) || '',
    imageUrl: photoUrl || undefined,
    url: shareUrl,
    metadata: {
      who: who || '',
      party: party || '',
      document_id: documentId,
      statement_type: statement.statement_type || '',
      date: statement.partOf?.date || '',
    },
  };

  const typeBadge = getStatementTypeBadge(statement.statement_type);

  // Detect motion outcome (only check procedural statements for performance)
  const motionResult = statement.procedural
    ? detectMotionOutcome(content, locale as 'en' | 'fr')
    : { hasMotion: false, outcome: null, displayText: null };

  return (
    <article
      id={statement.id}
      className={`
        relative
        ${isReply ? 'ml-8 mt-3' : 'mt-4'}
        ${colors.bg} ${colors.border} border-l-4 border
        rounded-lg p-4 shadow-sm
        transition-all hover:shadow-md
        scroll-mt-20
      `}
    >
      {/* Action Buttons - Top Right */}
      <div className="absolute top-3 right-3 z-20 flex gap-2">
        <BookmarkButton bookmarkData={bookmarkData} size="sm" />
        <ShareButton url={shareUrl} title={shareTitle} description={shareDescription} size="sm" />
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* MP Photo */}
        <div className="relative w-16 h-16 flex-shrink-0">
          {photoUrl && !imageError ? (
            <img
              src={photoUrl}
              alt={statement.madeBy?.name || 'MP'}
              className="w-16 h-16 rounded-lg object-contain"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-bg-tertiary flex items-center justify-center">
              <User className="h-8 w-8 text-text-tertiary" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 pr-20">
          {/* Speaker name and party */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {statement.madeBy?.id ? (
              <Link
                href={`/${locale}/mps/${statement.madeBy.id}`}
                className="font-semibold text-gray-900 dark:text-gray-100 hover:text-accent-red dark:hover:text-accent-red transition-colors"
              >
                {statement.madeBy.name || who || 'Unknown Speaker'}
              </Link>
            ) : (
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {statement.madeBy?.name || who || 'Unknown Speaker'}
              </h3>
            )}
            {isSpeaker && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200">
                {locale === 'fr' ? 'Président de la Chambre' : 'Speaker of the House'}
              </span>
            )}
            {party && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.badge}`}>
                {party}
              </span>
            )}
            {typeBadge && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge.color}`}>
                {typeBadge.label}
              </span>
            )}
          </div>

          {/* Time */}
          {statement.time && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {statement.time}
            </div>
          )}

          {/* Metadata: word count and procedural */}
          {(statement.wordcount || statement.procedural) && (
            <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 mt-1">
              {statement.wordcount && (
                <span>{statement.wordcount} {locale === 'fr' ? 'mots' : 'words'}</span>
              )}
              {statement.procedural && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 rounded-full font-medium">
                  {locale === 'fr' ? 'Procédural' : 'Procedural'}
                </span>
              )}
              {motionResult.hasMotion && motionResult.outcome && (
                <span className={`px-2 py-0.5 rounded-full font-medium ${getMotionBadgeColors(motionResult.outcome)}`}>
                  {motionResult.displayText}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Section headers (h1, h2, h3) */}
      {(h1 || h2 || h3) && (
        <div className="mb-2 text-sm text-gray-700 dark:text-gray-300 space-y-0.5">
          {h1 && <div className="font-semibold">{h1}</div>}
          {h2 && <div className="font-medium pl-2">{h2}</div>}
          {h3 && <div className="pl-4">{h3}</div>}
        </div>
      )}

      {/* Statement content */}
      <div
        className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed"
        dangerouslySetInnerHTML={{
          __html: processHansardLinks(
            content?.replace(/\n\n/g, '</p><p class="mt-3">').replace(/^/, '<p>').replace(/$/, '</p>') || ''
          ),
        }}
      />
    </article>
  );
}
