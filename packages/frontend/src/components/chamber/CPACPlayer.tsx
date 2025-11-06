/**
 * CPAC Video Player Component
 *
 * Plays parliamentary proceedings videos from CPAC or custom archive
 * - Live stream support
 * - Archived video playback
 * - Standard video controls
 * - Responsive 16:9 aspect ratio
 */

'use client';

import React from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Calendar, Maximize2 } from 'lucide-react';
import { Card } from '@canadagpt/design-system';

interface CPACPlayerProps {
  videoUrl?: string;
  title?: string;
  date?: string;
  isLive?: boolean;
  autoPlay?: boolean;
  compact?: boolean;
  onTimeUpdate?: (currentTime: number) => void;
  onTheaterMode?: () => void;
  noCard?: boolean;
}

export function CPACPlayer({
  videoUrl,
  title = 'House of Commons Proceedings',
  date,
  isLive = false,
  autoPlay = false,
  compact = false,
  onTimeUpdate,
  onTheaterMode,
  noCard = false,
}: CPACPlayerProps) {
  const [isPlaying, setIsPlaying] = React.useState(autoPlay);
  const [isMuted, setIsMuted] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && onTimeUpdate) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  };

  const content = (
    <>
      {/* Header */}
      <div className={`${compact ? 'px-3 py-2' : 'px-4 py-3'} bg-bg-overlay border-b border-border-subtle`}>
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h3 className={`font-semibold text-text-primary truncate ${compact ? 'text-sm' : ''}`}>{title}</h3>
            {date && !compact && (
              <div className="flex items-center gap-2 text-sm text-text-secondary mt-1">
                <Calendar className="h-4 w-4" />
                <span>{date}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isLive && (
              <div className={`flex items-center gap-2 ${compact ? 'px-2 py-0.5' : 'px-3 py-1'} bg-accent-red rounded-full`}>
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className={`text-white font-semibold ${compact ? 'text-xs' : 'text-sm'}`}>LIVE</span>
              </div>
            )}
            {compact && onTheaterMode && (
              <button
                onClick={onTheaterMode}
                className="p-1.5 rounded hover:bg-bg-elevated transition-colors text-text-secondary hover:text-text-primary"
                title="Expand to theater mode"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Video Player */}
      <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
        {videoUrl ? (
          <>
            <video
              ref={videoRef}
              className="w-full h-full"
              src={videoUrl}
              onTimeUpdate={handleTimeUpdate}
              autoPlay={autoPlay}
              controls={false}
            />

            {/* Custom Controls Overlay */}
            <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent ${compact ? 'p-2' : 'p-4'}`}>
              <div className={`flex items-center ${compact ? 'gap-2' : 'gap-4'}`}>
                <button
                  onClick={togglePlay}
                  className="text-white hover:text-gray-300 transition"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
                  ) : (
                    <Play className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
                  )}
                </button>

                <button
                  onClick={toggleMute}
                  className="text-white hover:text-gray-300 transition"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? (
                    <VolumeX className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
                  ) : (
                    <Volume2 className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
                  )}
                </button>

                <div className="flex-1" />

                {compact && onTheaterMode && (
                  <button
                    onClick={onTheaterMode}
                    className="text-white hover:text-gray-300 transition"
                    aria-label="Theater mode"
                  >
                    <Maximize2 className="h-5 w-5" />
                  </button>
                )}

                <button
                  onClick={() => videoRef.current?.requestFullscreen()}
                  className="text-white hover:text-gray-300 transition"
                  aria-label="Fullscreen"
                >
                  <Maximize className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
                </button>
              </div>
            </div>
          </>
        ) : (
          // Placeholder when no video
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No video available</p>
              <p className="text-sm mt-2">
                {isLive
                  ? 'The House is not currently in session'
                  : 'Select a debate to watch archived proceedings'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Info Footer */}
      {!compact && (
        <div className="px-4 py-3 bg-bg-overlay border-t border-border-subtle">
          <p className="text-xs text-text-tertiary">
            Video from CPAC (Cable Public Affairs Channel) • Parliament of Canada
          </p>
        </div>
      )}
    </>
  );

  return noCard ? content : <Card className="overflow-hidden">{content}</Card>;
}
