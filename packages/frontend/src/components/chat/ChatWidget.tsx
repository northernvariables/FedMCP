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
import { X, HelpCircle, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';
import { MapleLeafIcon } from '@canadagpt/design-system';
import { useChatOpen, useChatQuota, useChatExpanded } from '@/lib/stores/chatStore';
import { useChatStore } from '@/lib/stores/chatStore';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { useAuth } from '@/contexts/AuthContext';
import { ChatHistory } from './ChatHistory';
import { ChatInput } from './ChatInput';
import { ChatSuggestions } from './ChatSuggestions';
import { QuotaDisplay } from './QuotaDisplay';
import { ChatHelp } from './ChatHelp';

export function ChatWidget() {
  const [isOpen, toggleOpen] = useChatOpen();
  const [isExpanded, toggleExpanded] = useChatExpanded();
  const [showHelp, setShowHelp] = React.useState(false);
  const { checkQuota, refreshUsageStats} = useChatQuota();
  const { preferences, updatePreferences } = useUserPreferences();
  const { user } = useAuth();
  const { addMessage, messages, conversation, createConversation } = useChatStore();
  const [hasShownWelcome, setHasShownWelcome] = React.useState(false);

  // Handle pop-out to separate window
  const handlePopOut = () => {
    const width = 600;
    const height = 700;
    const left = window.screen.width - width - 50;
    const top = 50;

    window.open(
      '/chat/window',
      'ChatWindow',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no`
    );

    // Close the widget when popping out
    toggleOpen();
  };

  // Initialize quota check on mount
  React.useEffect(() => {
    if (!user) return; // Skip if not authenticated
    checkQuota();
    refreshUsageStats();
  }, [user, checkQuota, refreshUsageStats]);

  // Welcome flow for first-time users
  React.useEffect(() => {
    const showWelcome = async () => {
      // Only show welcome if user is logged in, hasn't seen it, and we haven't shown it this session
      if (user && preferences && !preferences.has_seen_welcome && !hasShownWelcome) {
        // Mark as shown immediately to prevent re-triggering
        setHasShownWelcome(true);

        // Wait a moment for the page to settle
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Open the chat
        if (!isOpen) {
          toggleOpen();
        }

        // Create conversation if it doesn't exist
        const currentConversation = useChatStore.getState().conversation;
        if (!currentConversation) {
          await createConversation();
        }

        // Wait another moment for the chat to open
        await new Promise(resolve => setTimeout(resolve, 500));

        // Add welcome message directly (not through API)
        const welcomeMessage = `Hey there. I'm Gordie, your guide to Canadian Parliament.

Ask me about MPs, bills, committees, lobbying, or anything related to federal politics. I'll give you context and connections from parliamentary records, lobbying data, and The Canadian Encyclopedia.

What would you like to know?`;

        const finalConversation = useChatStore.getState().conversation;
        if (finalConversation) {
          addMessage({
            id: crypto.randomUUID(),
            conversation_id: finalConversation.id,
            role: 'assistant',
            content: welcomeMessage,
            used_byo_key: false,
            created_at: new Date().toISOString(),
          });
        }

        // Mark as seen in preferences
        await updatePreferences({ has_seen_welcome: true });
      }
    };

    showWelcome();
  }, [user, preferences, hasShownWelcome, isOpen, toggleOpen, createConversation, addMessage, updatePreferences]);

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

  // Don't show chat widget for users who are not signed in
  if (!user) {
    return null;
  }

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
            <MapleLeafIcon className="w-[52px] h-[52px]" size={52} />

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
            className="z-50 bg-gray-900 bg-opacity-30 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 border-opacity-30 overflow-hidden flex flex-col relative pointer-events-auto transition-all duration-300"
            style={{
              position: 'fixed',
              bottom: isExpanded ? '0' : '24px',
              right: isExpanded ? '0' : '24px',
              top: isExpanded ? '0' : 'auto',
              width: isExpanded ? '25vw' : '600px',
              height: isExpanded ? '100vh' : '500px',
              maxHeight: isExpanded ? '100vh' : 'calc(100vh - 100px)',
              maxWidth: isExpanded ? '25vw' : 'calc(100vw - 100px)',
              borderRadius: isExpanded ? '0' : undefined,
            }}
          >
            {/* Content */}
            {(
              <div className="flex flex-col h-full">
                {/* Quota display */}
                <div className="flex-shrink-0">
                  <QuotaDisplay />
                </div>

                {/* Chat history - takes remaining space */}
                <ChatHistory />

                {/* Bottom section: suggestions + input + buttons */}
                <div className="flex-shrink-0">
                  {/* Suggested prompts */}
                  <ChatSuggestions />

                  {/* Input */}
                  <ChatInput />

                  {/* Control buttons */}
                  <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-gray-700 bg-gray-900">
                    {/* Left side buttons */}
                    <div className="flex items-center gap-2">
                      {/* Help button - just question mark */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowHelp(true);
                        }}
                        className="p-2 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors"
                        title="Show help"
                      >
                        <HelpCircle className="w-4 h-4" />
                      </button>

                      {/* Pop-out button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePopOut();
                        }}
                        className="p-2 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors"
                        title="Pop out to window"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>

                      {/* Expand button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpanded();
                        }}
                        className="p-2 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors"
                        title={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isExpanded ? (
                          <Minimize2 className="w-4 h-4" />
                        ) : (
                          <Maximize2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Close button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleOpen();
                      }}
                      className="p-2 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors"
                      title="Close (Esc)"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help modal */}
      {showHelp && <ChatHelp onClose={() => setShowHelp(false)} />}
    </>
  );
}
