/**
 * Live session statistics bar
 * Shows current speaker, bill under discussion, and session time
 */

'use client';

import { Clock, User, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';

export function LiveStatsBar() {
  const [sessionTime, setSessionTime] = useState('2:34:12');

  // Mock data - will be replaced with real API data later
  const liveData = {
    speaker: 'Hon. Chrystia Freeland',
    speakerTitle: 'Deputy Prime Minister',
    party: 'Liberal',
    currentBill: 'C-69 - Impact Assessment Act',
    isLive: true,
  };

  // Update session time every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setSessionTime(now.toLocaleTimeString('en-US', { hour12: false }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-bg-secondary border-b border-border">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Left: Current Speaker */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex-shrink-0">
              <User className="h-5 w-5 text-accent-red" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-text-primary truncate">
                  {liveData.speaker}
                </p>
                {liveData.isLive && (
                  <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold bg-accent-red text-white rounded">
                    LIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-text-secondary truncate">
                {liveData.speakerTitle} • {liveData.party}
              </p>
            </div>
          </div>

          {/* Center: Current Bill */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex-shrink-0">
              <FileText className="h-5 w-5 text-accent-red" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-text-secondary">Discussing</p>
              <p className="text-sm font-medium text-text-primary truncate">
                {liveData.currentBill}
              </p>
            </div>
          </div>

          {/* Right: Session Time */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <Clock className="h-5 w-5 text-accent-red" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Session Time</p>
              <p className="text-sm font-medium text-text-primary font-mono">
                {sessionTime}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
