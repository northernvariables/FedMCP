/**
 * ChatWidgetWrapper - Conditionally renders ChatWidget
 *
 * Prevents the widget from showing on the standalone chat window page
 */

'use client';

import { usePathname } from 'next/navigation';
import { ChatWidget } from './ChatWidget';

export function ChatWidgetWrapper() {
  const pathname = usePathname();

  // Don't render the widget on the standalone chat window page
  if (pathname?.includes('/chat/window')) {
    return null;
  }

  return <ChatWidget />;
}
