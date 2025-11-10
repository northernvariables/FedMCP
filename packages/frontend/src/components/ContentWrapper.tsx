/**
 * ContentWrapper - Adjusts main content when chat is expanded
 *
 * When chat is expanded to 25vw, this wrapper pushes content to the left
 * to maintain visibility and prevent overlap
 */

'use client';

import { useChatExpanded } from '@/lib/stores/chatStore';

export function ContentWrapper({ children }: { children: React.ReactNode }) {
  const [isExpanded] = useChatExpanded();

  return (
    <div
      className="transition-all duration-300"
      style={{
        marginRight: isExpanded ? '25vw' : '0',
      }}
    >
      {children}
    </div>
  );
}
