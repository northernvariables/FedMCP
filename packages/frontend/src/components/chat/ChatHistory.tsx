/**
 * ChatHistory Component
 *
 * Scrollable message container with:
 * - Auto-scroll to bottom on new messages
 * - "Scroll to bottom" button when scrolled up
 * - Loading indicator
 * - Empty state
 */

'use client';

import React from 'react';
import { ArrowDown, Loader2 } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { useChatMessages } from '@/lib/stores/chatStore';

export function ChatHistory() {
  const { messages, isLoading } = useChatMessages();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = React.useState(false);
  const [isAtBottom, setIsAtBottom] = React.useState(true);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    if (isAtBottom && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAtBottom]);

  // Detect if user has scrolled up
  const handleScroll = () => {
    if (!scrollRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;

    setIsAtBottom(atBottom);
    setShowScrollButton(!atBottom && messages.length > 0);
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  // Empty state
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-accent-red/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-accent-red"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Start a conversation
          </h3>
          <p className="text-sm text-gray-400">
            Ask me anything about Canadian federal politics, MPs, bills, lobbying, or government spending.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      {/* Messages container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-4 py-6 space-y-4"
        style={{ scrollBehavior: 'smooth' }}
      >
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {/* Loading indicator (streaming message) */}
        {isLoading && (
          <div className="flex gap-3 mb-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center text-sm font-medium text-gray-300">
              AI
            </div>
            <div className="flex-1 max-w-[80%]">
              <div className="rounded-lg px-4 py-3 bg-gray-800 border border-gray-700">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-accent-red" />
                  <span className="text-sm text-gray-400">Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 w-10 h-10 bg-gray-800 border-2 border-gray-700 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
          title="Scroll to bottom"
        >
          <ArrowDown className="w-5 h-5 text-gray-300" />
        </button>
      )}
    </div>
  );
}
