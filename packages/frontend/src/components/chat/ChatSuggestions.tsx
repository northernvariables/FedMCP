/**
 * ChatSuggestions Component
 *
 * Context-aware suggested prompts that users can click to send:
 * - Adapts to current page context (MP, Bill, Dashboard, etc.)
 * - Click to auto-fill and send
 * - Only shows when no messages yet
 */

'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { useChatContext, useChatMessages, useChatInput } from '@/lib/stores/chatStore';
import type { SuggestedPrompt, ContextType } from '@/lib/types/chat';

// Context-aware suggested prompts
const CONTEXT_PROMPTS: Record<ContextType, SuggestedPrompt[]> = {
  general: [
    { label: 'Daily Summary', prompt: 'What happened in Parliament today? Give me a summary of the key activities and debates.' },
    { label: 'How Parliament Works', prompt: 'Explain the legislative process in Canada - how does a bill become a law?' },
    { label: 'Question Period', prompt: 'What is Question Period and how does it work in the House of Commons?' },
    { label: 'Top spenders', prompt: 'Which MPs have the highest expenses this quarter?' },
  ],
  mp: [
    { label: 'Bills sponsored', prompt: 'What bills has this MP sponsored?' },
    { label: 'Expense breakdown', prompt: 'How does this MP\'s spending compare to their party average?' },
    { label: 'Voting record', prompt: 'Show me this MP\'s recent voting record' },
    { label: 'Petitions', prompt: 'What petitions has this MP sponsored?' },
  ],
  bill: [
    { label: 'Summarize', prompt: 'Summarize this bill in simple terms' },
    { label: 'Lobbying', prompt: 'Who is lobbying on this bill?' },
    { label: 'Voting record', prompt: 'What\'s the voting record for this bill?' },
    { label: 'Timeline', prompt: 'Show the legislative timeline for this bill' },
  ],
  dashboard: [
    { label: 'Top spenders', prompt: 'Show me the top spending MPs this quarter' },
    { label: 'Controversial bills', prompt: 'What are the most controversial bills right now?' },
    { label: 'Conflicts', prompt: 'Find potential conflicts of interest' },
    { label: 'Trends', prompt: 'What are the major legislative trends?' },
  ],
  lobbying: [
    { label: 'Top clients', prompt: 'Which organizations lobby the most?' },
    { label: 'Recent meetings', prompt: 'Show recent lobbyist meetings with government officials' },
    { label: 'By industry', prompt: 'Break down lobbying activity by industry' },
  ],
  spending: [
    { label: 'Outliers', prompt: 'Show unusual spending patterns' },
    { label: 'By party', prompt: 'Compare spending across political parties' },
    { label: 'Trends', prompt: 'How has government spending changed over time?' },
  ],
};

export function ChatSuggestions() {
  const { contextType } = useChatContext();
  const { messages } = useChatMessages();
  const { sendMessage } = useChatInput();

  // When there are messages, always show 'general' context suggestions
  // When there are no messages, show context-specific suggestions
  const effectiveContext = messages.length > 0 ? 'general' : (contextType || 'general');
  const prompts = CONTEXT_PROMPTS[effectiveContext];

  const handleSuggestionClick = async (prompt: string) => {
    console.log('[ChatSuggestions] Suggestion clicked:', prompt);
    console.log('[ChatSuggestions] sendMessage function:', sendMessage);
    try {
      await sendMessage(prompt);
      console.log('[ChatSuggestions] Message sent successfully');
    } catch (error) {
      console.error('[ChatSuggestions] Error sending message:', error);
    }
  };

  return (
    <div className="flex-shrink-0 px-4 py-3 border-t border-gray-700 bg-gray-800">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-accent-red" />
        <span className="text-xs font-medium text-gray-400">
          Suggested questions
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {prompts.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => handleSuggestionClick(suggestion.prompt)}
            className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-full text-sm text-gray-300 hover:bg-accent-red hover:text-white hover:border-accent-red transition-colors"
          >
            {suggestion.label}
          </button>
        ))}
      </div>
    </div>
  );
}
