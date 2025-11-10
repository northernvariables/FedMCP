/**
 * ResultsPromptCard Component
 *
 * Displayed after chatbot returns results that can be viewed on a dedicated page
 * Offers options to view results, open in new tab, or dismiss
 */

'use client';

import React from 'react';
import { ExternalLink, Eye, X } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';

interface ResultsPromptCardProps {
  url: string;
  resultCount?: number;
  resultType?: string; // e.g., "speeches", "bills", "MPs"
  onDismiss: () => void;
}

export function ResultsPromptCard({
  url,
  resultCount,
  resultType = 'results',
  onDismiss,
}: ResultsPromptCardProps) {
  const router = useRouter();

  const handleViewResults = () => {
    router.push(url as any);
  };

  const handleOpenNewTab = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
    onDismiss();
  };

  return (
    <div className="mt-4 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-accent-red" />
          <div>
            <h3 className="text-sm font-semibold text-white">
              View Full Results
            </h3>
            {resultCount && (
              <p className="text-xs text-gray-400 mt-0.5">
                {resultCount} {resultType} found
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Message */}
      <p className="text-sm text-gray-300 mb-3">
        Would you like to see these results on a dedicated page with advanced filtering and interactive cards?
      </p>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleViewResults}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent-red hover:bg-accent-red/90 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Eye className="w-4 h-4" />
          <span>View Results</span>
        </button>

        <button
          onClick={handleOpenNewTab}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Open in New Tab</span>
        </button>

        <button
          onClick={onDismiss}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors border border-gray-600"
        >
          No Thanks
        </button>
      </div>
    </div>
  );
}
