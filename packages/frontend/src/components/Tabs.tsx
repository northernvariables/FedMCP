/**
 * Simple tabs component
 */

'use client';

import { ReactNode, useState, useEffect } from 'react';

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

  // Handle URL hash on mount and hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // Remove the '#'
      if (hash && tabs.some(tab => tab.id === hash)) {
        setActiveTab(hash);
        onTabChange?.(hash);
      }
    };

    // Check hash on mount
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [tabs, onTabChange]);

  const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content;

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    // Update URL hash without triggering a page reload
    window.history.pushState(null, '', `#${tabId}`);
    // Call the onTabChange callback if provided
    onTabChange?.(tabId);
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
