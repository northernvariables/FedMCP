/**
 * Chat Window Page - Standalone chat in separate window
 *
 * Features:
 * - Full-screen chat interface
 * - Shares state with main app via Zustand store
 * - No navigation or layout elements
 */

'use client';

import React from 'react';
import { ChatHistory } from '@/components/chat/ChatHistory';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatSuggestions } from '@/components/chat/ChatSuggestions';
import { QuotaDisplay } from '@/components/chat/QuotaDisplay';
import { ChatHelp } from '@/components/chat/ChatHelp';
import { useChatQuota } from '@/lib/stores/chatStore';
import { useChatStore } from '@/lib/stores/chatStore';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { useAuth } from '@/contexts/AuthContext';
import { HelpCircle } from 'lucide-react';

export default function ChatWindowPage() {
  const [showHelp, setShowHelp] = React.useState(false);
  const { checkQuota, refreshUsageStats } = useChatQuota();
  const { preferences, updatePreferences } = useUserPreferences();
  const { user } = useAuth();
  const { addMessage, conversation, createConversation } = useChatStore();
  const [hasShownWelcome, setHasShownWelcome] = React.useState(false);

  // Initialize quota check on mount
  React.useEffect(() => {
    if (!user) return;
    checkQuota();
    refreshUsageStats();
  }, [user, checkQuota, refreshUsageStats]);

  // Welcome flow for first-time users
  React.useEffect(() => {
    const showWelcome = async () => {
      if (user && preferences && !preferences.has_seen_welcome && !hasShownWelcome) {
        setHasShownWelcome(true);

        // Create conversation if it doesn't exist
        const currentConversation = useChatStore.getState().conversation;
        if (!currentConversation) {
          await createConversation();
        }

        // Wait for conversation to be created
        await new Promise(resolve => setTimeout(resolve, 500));

        // Add welcome message
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
  }, [user, preferences, hasShownWelcome, createConversation, addMessage, updatePreferences]);

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Please Sign In</h1>
          <p className="text-gray-400">You need to be signed in to use the chat.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
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
        <div className="flex items-center justify-start gap-2 px-4 py-3 border-t border-gray-700 bg-gray-900">
          {/* Help button */}
          <button
            onClick={() => setShowHelp(true)}
            className="p-2 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors"
            title="Show help"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Help modal */}
      {showHelp && <ChatHelp onClose={() => setShowHelp(false)} />}
    </div>
  );
}
