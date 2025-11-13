/**
 * Simple tabs component
 */

'use client';

import { ReactNode, useState, useEffect, useRef, useMemo } from 'react';

export interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onTabChange?: (tabId: string) => void;
}

export function Tabs({ tabs, defaultTab, onTabChange }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
  const onTabChangeRef = useRef(onTabChange);

  // Memoize tab IDs to avoid re-running effect when tabs array is recreated with same IDs
  const tabIdsKey = useMemo(() => tabs.map(t => t.id).join(','), [tabs]);

  // Keep ref up to date
  useEffect(() => {
    onTabChangeRef.current = onTabChange;
  }, [onTabChange]);

  // Handle URL hash on mount and hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // Remove the '#'
      if (hash && tabs.some(tab => tab.id === hash)) {
        setActiveTab(hash);
        onTabChangeRef.current?.(hash);
      }
    };

    // Check hash on mount
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [tabIdsKey, tabs]); // Only re-run if tab IDs change

  const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content;

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    // Update URL hash without triggering a page reload
    window.history.pushState(null, '', `#${tabId}`);
    // Call the onTabChange callback if provided
    onTabChangeRef.current?.(tabId);
  };

  return (
    <div className="space-y-6">
      {/* Tab buttons */}
      <div className="border-b border-border-subtle">
        <div className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              data-tab-id={tab.id}
              className={`pb-4 px-1 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-accent-red'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-red" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">{activeTabContent}</div>
    </div>
  );
}
