/**
 * Video Playlist Component
 *
 * Shows list of debates/videos that can be selected for playback
 * - Displays recent debates
 * - Shows date, title, duration
 * - Highlights currently playing video
 */

'use client';

import React from 'react';
import { Calendar, Clock, Play } from 'lucide-react';
import { Card } from '@canadagpt/design-system';

interface Debate {
  id: string;
  date: string;
  topic?: string;
  cpac_video_url?: string;
  video_duration?: number;
}

interface VideoPlaylistProps {
  debates: Debate[];
  selectedDebateId?: string;
  onDebateSelect: (debate: Debate) => void;
}

export function VideoPlaylist({ debates, selectedDebateId, onDebateSelect }: VideoPlaylistProps) {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-white/10">
        <h3 className="font-semibold text-white">Video Playlist</h3>
        <p className="text-xs text-white/70 mt-1">
          {debates.length} debate{debates.length !== 1 ? 's' : ''} available
        </p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        {debates.length === 0 ? (
          <div className="p-4 text-center text-white/70 text-sm">
            <p>No videos available</p>
            <p className="text-xs text-white/50 mt-1">
              Videos will appear here once uploaded
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {debates.map((debate) => {
              const isSelected = debate.id === selectedDebateId;
              const hasVideo = !!debate.cpac_video_url;

              return (
                <button
                  key={debate.id}
                  onClick={() => hasVideo && onDebateSelect(debate)}
                  className={`
                    w-full px-4 py-3 text-left transition-colors
                    ${isSelected
                      ? 'bg-white/20 border-l-4 border-accent-blue'
                      : 'hover:bg-white/10 border-l-4 border-transparent'
                    }
                    ${!hasVideo ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                  disabled={!hasVideo}
                >
                  <div className="flex items-start gap-3">
                    {isSelected ? (
                      <Play className="h-4 w-4 text-accent-blue flex-shrink-0 mt-0.5 fill-current" />
                    ) : (
                      <Play className="h-4 w-4 text-white/70 flex-shrink-0 mt-0.5" />
                    )}

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isSelected ? 'text-accent-blue' : 'text-white'} truncate`}>
                        {debate.topic || 'House Proceedings'}
                      </p>

                      <div className="flex items-center gap-3 mt-1 text-xs text-white/70">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(debate.date)}</span>
                        </div>
                        {debate.video_duration && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDuration(debate.video_duration)}</span>
                          </div>
                        )}
                      </div>

                      {!hasVideo && (
                        <p className="text-xs text-white/50 mt-1">
                          Video not available
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
