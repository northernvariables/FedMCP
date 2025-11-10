/**
 * ChatInput Component
 *
 * Message input field with:
 * - Auto-expanding textarea
 * - Character count
 * - Send button with loading state
 * - Keyboard shortcuts (Enter to send, Shift+Enter for newline)
 * - Disabled state during loading
 */

'use client';

import React from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useChatInput } from '@/lib/stores/chatStore';

const MAX_LENGTH = 2000;

export function ChatInput() {
  const { input, setInput, sendMessage, isLoading } = useChatInput();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[ChatInput] handleSubmit called', { input, isLoading });

    if (!input.trim() || isLoading) {
      console.log('[ChatInput] Submit blocked - empty input or loading');
      return;
    }

    console.log('[ChatInput] Sending message:', input);
    await sendMessage(input);

    // Reset textarea height after sending
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const remainingChars = MAX_LENGTH - input.length;
  const isNearLimit = remainingChars < 100;

  return (
    <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-gray-700 bg-gray-900">
      <div className="flex gap-2">
        {/* Textarea */}
        <div className="flex-1 relative">
          {/* Terminal prompt */}
          <div className="absolute left-4 top-3 text-white font-mono pointer-events-none flex items-center z-10">
            <span className="opacity-80">&gt;</span>
          </div>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about Parliament, MPs, bills..."
            disabled={isLoading}
            maxLength={MAX_LENGTH}
            rows={1}
            className={`w-full resize-none rounded-lg pl-10 py-3 pr-16 text-sm focus:outline-none focus:ring-1 focus:ring-accent-red font-mono bg-gray-800 border-0 caret-white placeholder-gray-500 overflow-hidden ${
              isLoading
                ? 'cursor-not-allowed opacity-60 text-gray-400'
                : 'text-white'
            }`}
            style={{
              minHeight: '48px',
              maxHeight: '120px',
            }}
          />

          {/* Character count (only show when near limit) */}
          {isNearLimit && (
            <div
              className={`absolute bottom-2 right-14 text-xs ${
                remainingChars < 0
                  ? 'text-red-600 font-semibold'
                  : remainingChars < 50
                  ? 'text-orange-600'
                  : 'text-text-tertiary'
              }`}
            >
              {remainingChars}
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!input.trim() || isLoading || remainingChars < 0}
          className={`flex-shrink-0 self-start h-12 w-12 rounded-lg flex items-center justify-center transition-colors ${
            !input.trim() || isLoading || remainingChars < 0
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-accent-red text-white hover:bg-red-700 active:scale-95'
          }`}
          title={isLoading ? 'Sending...' : 'Send message (Enter)'}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Helper text */}
      <div className="mt-2 text-xs text-gray-500">
        Press <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700 text-gray-300">Enter</kbd> to send,{' '}
        <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700 text-gray-300">Shift</kbd> +{' '}
        <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700 text-gray-300">Enter</kbd> for new line
      </div>
    </form>
  );
}
