'use client';

import { Calendar, MessageSquare, Users, Download, Share2, Bookmark } from 'lucide-react';
import { useLocale } from 'next-intl';

interface DocumentInfo {
  id: string;
  date: string | number;
  session_id: string;
  document_type: string;
  number: number;
  xml_source_url?: string;
}

interface DebateContextCardProps {
  document: DocumentInfo;
  statementCount: number;
  speakerCount?: number;
}

export function DebateContextCard({ document, statementCount, speakerCount }: DebateContextCardProps) {
  const locale = useLocale();

  // Format date
  const formatDate = (dateValue: string | number) => {
    let date: Date;

    if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    } else if (typeof dateValue === 'number') {
      date = dateValue > 9999999999 ? new Date(dateValue) : new Date(dateValue * 1000);
    } else {
      date = new Date(dateValue);
    }

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
    switch (document.document_type) {
      case 'D':
        return locale === 'fr' ? 'Débats de la Chambre des communes' : 'House of Commons Debates';
      case 'E':
        return locale === 'fr' ? 'Témoignages de comité' : 'Committee Evidence';
      default:
        return document.document_type;
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${getDocumentTypeLabel()} - ${formatDate(document.date)}`,
          url: window.location.href
        });
      } catch (err) {
        // User cancelled or error occurred
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      // You could show a toast notification here
    }
  };

  const handleDownload = () => {
    if (document.xml_source_url) {
      window.open(document.xml_source_url, '_blank');
    }
  };

  return (
    <div className="bg-bg-elevated border border-border-subtle rounded-lg p-6 mb-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            {getDocumentTypeLabel()}
          </h1>
          <div className="flex items-center gap-2 text-text-secondary">
            <Calendar className="h-4 w-4" />
            <span className="text-lg">{formatDate(document.date)}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-text-tertiary mt-2">
            <span>
              {locale === 'fr' ? 'No' : 'No.'} {document.number}
            </span>
            {document.session_id && (
              <>
                <span>•</span>
                <span>
                  {locale === 'fr' ? 'Session' : 'Session'} {document.session_id}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {document.xml_source_url && (
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg bg-bg-overlay hover:bg-bg-base transition-colors"
              title={locale === 'fr' ? 'Télécharger XML' : 'Download XML'}
            >
              <Download className="h-5 w-5 text-text-tertiary" />
            </button>
          )}
          <button
            onClick={handleShare}
            className="p-2 rounded-lg bg-bg-overlay hover:bg-bg-base transition-colors"
            title={locale === 'fr' ? 'Partager' : 'Share'}
          >
            <Share2 className="h-5 w-5 text-text-tertiary" />
          </button>
          <button
            className="p-2 rounded-lg bg-bg-overlay hover:bg-bg-base transition-colors"
            title={locale === 'fr' ? 'Sauvegarder' : 'Bookmark'}
          >
            <Bookmark className="h-5 w-5 text-text-tertiary" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-6 pt-4 border-t border-border-subtle">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-accent-red" />
          <div>
            <div className="text-2xl font-bold text-text-primary">
              {statementCount.toLocaleString()}
            </div>
            <div className="text-xs text-text-tertiary">
              {locale === 'fr'
                ? statementCount === 1
                  ? 'intervention'
                  : 'interventions'
                : statementCount === 1
                ? 'speech'
                : 'speeches'}
            </div>
          </div>
        </div>

        {speakerCount !== undefined && (
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-accent-red" />
            <div>
              <div className="text-2xl font-bold text-text-primary">
                {speakerCount}
              </div>
              <div className="text-xs text-text-tertiary">
                {locale === 'fr'
                  ? speakerCount === 1
                    ? 'député'
                    : 'députés'
                  : speakerCount === 1
                  ? 'MP'
                  : 'MPs'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
