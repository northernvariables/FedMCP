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
import { MapleLeafIcon } from '@canadagpt/design-system';
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

  // Empty state - just return empty container, welcome message will appear
  if (messages.length === 0 && !isLoading) {
    return <div className="flex-1 relative overflow-hidden" />;
  }

  return (
    <div className="flex-1 relative overflow-hidden">
      {/* Messages container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-auto px-4 py-6 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900"
        style={{ scrollBehavior: 'smooth' }}
      >
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {/* Loading indicator (streaming message) */}
        {isLoading && (
          <div className="flex gap-3 mb-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center text-white">
              <MapleLeafIcon className="w-5 h-5" size={20} />
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
