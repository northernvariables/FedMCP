/**
 * Live transcript/captions panel
 * Shows real-time text of chamber proceedings
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Pause, Play, Search } from 'lucide-react';
import { Card } from '@canadagpt/design-system';

// Mock transcript data - will be replaced with real-time API data
const MOCK_TRANSCRIPT = [
  {
    id: 1,
    speaker: 'Hon. Chrystia Freeland',
    party: 'Liberal',
    time: '14:32:15',
    text: 'Mr. Speaker, I rise today to address the critical importance of Bill C-69, the Impact Assessment Act. This legislation represents a significant step forward in our commitment to environmental protection while fostering economic growth.',
  },
  {
    id: 2,
    speaker: 'Hon. Pierre Poilievre',
    party: 'Conservative',
    time: '14:33:42',
    text: 'Mr. Speaker, I must respectfully disagree with the Deputy Prime Minister. This bill will impose unnecessary regulatory burdens on Canadian businesses and stifle innovation in our resource sector.',
  },
  {
    id: 3,
    speaker: 'Jagmeet Singh',
    party: 'NDP',
    time: '14:35:18',
    text: 'Mr. Speaker, while I appreciate the concerns raised by my colleagues, I believe we must find a balance between environmental stewardship and economic prosperity. The people of Canada deserve nothing less.',
  },
  {
    id: 4,
    speaker: 'Yves-François Blanchet',
    party: 'Bloc Québécois',
    time: '14:36:55',
    text: "Monsieur le Président, le Québec a démontré qu'il est possible de protéger l'environnement tout en maintenant une économie forte. Ce projet de loi doit reconnaître les compétences provinciales.",
  },
];

export function TranscriptPanel() {
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (isAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isAutoScroll]);

  const filteredTranscript = MOCK_TRANSCRIPT.filter((item) =>
    searchQuery
      ? item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.speaker.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const highlightText = (text: string, query: string) => {
    if (!query) return text;

    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-500/30 text-text-primary">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
        <h3 className="text-lg font-semibold text-text-primary">
          Live Transcript
        </h3>
        <div className="flex items-center gap-2">
          {/* Search Toggle Button */}
          <button
            onClick={() => setIsSearchExpanded(!isSearchExpanded)}
            className={`p-2 rounded-lg hover:bg-bg-elevated transition-colors ${
              isSearchExpanded ? 'bg-bg-elevated' : ''
            }`}
            title="Search transcript"
          >
            <Search className={`h-4 w-4 ${searchQuery ? 'text-accent-red' : 'text-text-secondary'}`} />
          </button>
          {/* Auto-scroll Toggle */}
          <button
            onClick={() => setIsAutoScroll(!isAutoScroll)}
            className="p-2 rounded-lg hover:bg-bg-elevated transition-colors"
            title={isAutoScroll ? 'Pause auto-scroll' : 'Resume auto-scroll'}
          >
            {isAutoScroll ? (
              <Pause className="h-4 w-4 text-accent-red" />
            ) : (
              <Play className="h-4 w-4 text-text-secondary" />
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Search */}
      {isSearchExpanded && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-bg-elevated border border-border rounded-lg text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-red focus:border-transparent"
            autoFocus
          />
        </div>
      )}

      {/* Transcript Content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
      >
        {filteredTranscript.map((item) => (
          <div
            key={item.id}
            className="p-3 bg-bg-elevated rounded-lg space-y-1"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">
                  {item.speaker}
                </span>
                <span className="text-xs text-text-secondary">
                  {item.party}
                </span>
              </div>
              <span className="text-xs text-text-secondary font-mono">
                {item.time}
              </span>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              {highlightText(item.text, searchQuery)}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
