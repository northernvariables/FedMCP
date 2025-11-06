/**
 * ChatMessage Component
 *
 * Renders individual chat messages with:
 * - Markdown formatting (react-markdown + remark-gfm)
 * - User vs. Assistant styling
 * - Timestamp display
 * - Copy to clipboard button
 */

'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';
import type { Message } from '@/lib/types/chat';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <div
      className={`group flex gap-3 ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      } mb-4`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          isUser
            ? 'bg-accent-red text-white'
            : 'bg-gray-700 text-gray-300 border border-gray-600'
        }`}
      >
        {isUser ? 'U' : 'AI'}
      </div>

      {/* Message Content */}
      <div
        className={`flex-1 max-w-[80%] ${
          isUser ? 'items-end' : 'items-start'
        }`}
      >
        {/* Message Bubble */}
        <div
          className={`rounded-lg px-4 py-3 ${
            isUser
              ? 'bg-accent-red text-white'
              : 'bg-gray-800 border border-gray-700 text-gray-100'
          }`}
        >
          {isAssistant ? (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Custom link styling
                  a: ({ node, ...props }) => (
                    <a
                      {...props}
                      className="text-accent-red hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  ),
                  // Custom code block styling
                  code: ({ node, inline, ...props }) =>
                    inline ? (
                      <code
                        {...props}
                        className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm"
                      />
                    ) : (
                      <code
                        {...props}
                        className="block bg-gray-100 dark:bg-gray-800 p-3 rounded-md text-sm overflow-x-auto"
                      />
                    ),
                  // Custom paragraph spacing
                  p: ({ node, ...props }) => (
                    <p {...props} className="mb-2 last:mb-0" />
                  ),
                  // Custom list styling
                  ul: ({ node, ...props }) => (
                    <ul {...props} className="list-disc ml-4 mb-2" />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol {...props} className="list-decimal ml-4 mb-2" />
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        {/* Message Metadata */}
        <div
          className={`flex items-center gap-2 mt-1 text-xs text-gray-500 ${
            isUser ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          {/* Timestamp */}
          <span>
            {new Date(message.created_at).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>

          {/* Token Count (for assistant messages) */}
          {isAssistant && message.tokens_total && (
            <span className="text-gray-600">
              {message.tokens_total.toLocaleString()} tokens
            </span>
          )}

          {/* Copy Button (only visible on hover for assistant messages) */}
          {isAssistant && (
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-700 rounded"
              title="Copy message"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-gray-400" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
