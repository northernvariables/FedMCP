/**
 * ChatWidget Component - Main Floating Chat Interface
 *
 * Features:
 * - Floating bottom-right widget
 * - Keyboard shortcut (Cmd/Ctrl + K)
 * - Collapsed/Expanded states with animations
 * - Integrates all chat components
 * - Persists across navigation
 */

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minimize2, Maximize2 } from 'lucide-react';
import { MapleLeafIcon } from '@canadagpt/design-system';
import { useChatOpen, useChatQuota } from '@/lib/stores/chatStore';
import { ChatHistory } from './ChatHistory';
import { ChatInput } from './ChatInput';
import { ChatSuggestions } from './ChatSuggestions';
import { QuotaDisplay } from './QuotaDisplay';

export function ChatWidget() {
  const [isOpen, toggleOpen] = useChatOpen();
  const [isMinimized, setIsMinimized] = React.useState(false);
  const { checkQuota, refreshUsageStats } = useChatQuota();

  // Initialize quota check on mount
  React.useEffect(() => {
    checkQuota();
    refreshUsageStats();
  }, [checkQuota, refreshUsageStats]);

  // Keyboard shortcut: Cmd/Ctrl + K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleOpen();
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        toggleOpen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, toggleOpen]);

  return (
    <>
      {/* Floating button (shows when closed) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={toggleOpen}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-accent-red text-white rounded-full shadow-lg hover:bg-red-700 active:scale-95 transition-colors flex items-center justify-center group"
            title="Open chat (⌘K)"
          >
            <MapleLeafIcon className="w-[52px] h-[52px]" />

            {/* Keyboard hint tooltip */}
            <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Press ⌘K to open
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat widget (shows when open) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="z-50 bg-gray-900 bg-opacity-30 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 border-opacity-30 overflow-hidden flex flex-col relative"
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              width: isMinimized ? '400px' : '600px',
              height: isMinimized ? '60px' : '500px',
              maxHeight: 'calc(100vh - 100px)',
              maxWidth: 'calc(100vw - 100px)',
            }}
          >
            {/* Content (hidden when minimized) */}
            {!isMinimized && (
              <>
                {/* Quota display */}
                <QuotaDisplay />

                {/* Chat history */}
                <ChatHistory />

                {/* Input */}
                <ChatInput />

                {/* Suggested prompts */}
                <ChatSuggestions />
              </>
            )}

            {/* Control buttons - bottom right */}
            <div className="absolute bottom-4 right-4 flex items-center gap-2 z-50">
              {/* Minimize/Maximize button */}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-2 bg-gray-800 bg-opacity-70 hover:bg-accent-red text-white rounded-lg transition-colors backdrop-blur-sm"
                title={isMinimized ? 'Maximize' : 'Minimize'}
              >
                {isMinimized ? (
                  <Maximize2 className="w-4 h-4" />
                ) : (
                  <Minimize2 className="w-4 h-4" />
                )}
              </button>

              {/* Close button */}
              <button
                onClick={toggleOpen}
                className="p-2 bg-gray-800 bg-opacity-70 hover:bg-accent-red text-white rounded-lg transition-colors backdrop-blur-sm"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
