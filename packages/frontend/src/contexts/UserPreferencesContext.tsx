/**
 * User Preferences Context
 * Manages user-specific settings stored in Supabase
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export interface UserPreferences {
  // Threading preferences
  threadedViewEnabled: boolean;
  threadedViewDefaultCollapsed: boolean;

  // Display preferences
  language: 'en' | 'fr';
  theme: 'light' | 'dark' | 'system';
  density: 'compact' | 'comfortable' | 'spacious';

  // Content preferences
  showProceduralStatements: boolean;
  defaultHansardFilter: 'all' | 'debates' | 'committees';
  statementsPerPage: number;

  // Notification preferences
  emailNotifications: boolean;
  pushNotifications: boolean;

  // Chat preferences
  has_seen_welcome?: boolean;
}

// Default preferences for new users or when not authenticated
export const DEFAULT_PREFERENCES: UserPreferences = {
  threadedViewEnabled: true,
  threadedViewDefaultCollapsed: false,
  language: 'en',
  theme: 'system',
  density: 'comfortable',
  showProceduralStatements: false,
  defaultHansardFilter: 'all',
  statementsPerPage: 20,
  emailNotifications: true,
  pushNotifications: false,
  has_seen_welcome: false,
};

interface UserPreferencesContextType {
  preferences: UserPreferences;
  loading: boolean;
  user: { id: string; email: string } | null;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  resetPreferences: () => Promise<void>;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const { data: session, status } = useSession();

  // Map NextAuth user to simple user object
  const user = session?.user ? { id: session.user.id, email: session.user.email! } : null;

  /**
   * Load preferences from API or localStorage
   */
  const loadPreferences = useCallback(async (currentUser: { id: string; email: string } | null) => {
    try {
      if (currentUser) {
        // Load from API for authenticated users
        const response = await fetch('/api/user/preferences');

        if (!response.ok) {
          console.error('Error loading preferences:', response.status);
          // Fall back to defaults
          setPreferences(DEFAULT_PREFERENCES);
        } else {
          const { data } = await response.json();

          if (data) {
            // Map database column names to camelCase
            setPreferences({
              threadedViewEnabled: data.threaded_view_enabled ?? DEFAULT_PREFERENCES.threadedViewEnabled,
              threadedViewDefaultCollapsed: data.threaded_view_default_collapsed ?? DEFAULT_PREFERENCES.threadedViewDefaultCollapsed,
              language: data.language ?? DEFAULT_PREFERENCES.language,
              theme: data.theme ?? DEFAULT_PREFERENCES.theme,
              density: data.density ?? DEFAULT_PREFERENCES.density,
              showProceduralStatements: data.show_procedural_statements ?? DEFAULT_PREFERENCES.showProceduralStatements,
              defaultHansardFilter: data.default_hansard_filter ?? DEFAULT_PREFERENCES.defaultHansardFilter,
              statementsPerPage: data.statements_per_page ?? DEFAULT_PREFERENCES.statementsPerPage,
              emailNotifications: data.email_notifications ?? DEFAULT_PREFERENCES.emailNotifications,
              pushNotifications: data.push_notifications ?? DEFAULT_PREFERENCES.pushNotifications,
              has_seen_welcome: data.has_seen_welcome ?? DEFAULT_PREFERENCES.has_seen_welcome,
            });
          } else {
            // No preferences found, use defaults
            setPreferences(DEFAULT_PREFERENCES);
          }
        }
      } else {
        // Not authenticated - load from localStorage
        const stored = localStorage.getItem('canadagpt_preferences');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
          } catch (e) {
            console.error('Error parsing stored preferences:', e);
            setPreferences(DEFAULT_PREFERENCES);
          }
        } else {
          setPreferences(DEFAULT_PREFERENCES);
        }
      }
    } catch (error) {
      console.error('Error in loadPreferences:', error);
      setPreferences(DEFAULT_PREFERENCES);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Initialize - load user and preferences
   * React to NextAuth session changes
   */
  useEffect(() => {
    if (status !== 'loading') {
      setLoading(true);
      loadPreferences(user);
    }
  }, [user?.id, status, loadPreferences]);

  /**
   * Update preferences
   */
  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);

    if (user) {
      // Save to API for authenticated users
      // Map camelCase to snake_case for database
      const dbUpdates: any = {};
      if ('threadedViewEnabled' in updates) dbUpdates.threaded_view_enabled = updates.threadedViewEnabled;
      if ('threadedViewDefaultCollapsed' in updates) dbUpdates.threaded_view_default_collapsed = updates.threadedViewDefaultCollapsed;
      if ('language' in updates) dbUpdates.language = updates.language;
      if ('theme' in updates) dbUpdates.theme = updates.theme;
      if ('density' in updates) dbUpdates.density = updates.density;
      if ('showProceduralStatements' in updates) dbUpdates.show_procedural_statements = updates.showProceduralStatements;
      if ('defaultHansardFilter' in updates) dbUpdates.default_hansard_filter = updates.defaultHansardFilter;
      if ('statementsPerPage' in updates) dbUpdates.statements_per_page = updates.statementsPerPage;
      if ('emailNotifications' in updates) dbUpdates.email_notifications = updates.emailNotifications;
      if ('pushNotifications' in updates) dbUpdates.push_notifications = updates.pushNotifications;
      if ('has_seen_welcome' in updates) dbUpdates.has_seen_welcome = updates.has_seen_welcome;

      const response = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dbUpdates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.warn('Error saving preferences via API:', errorData.error);
        // Still update local state even if save fails
      }
    } else {
      // Save to localStorage for non-authenticated users
      localStorage.setItem('canadagpt_preferences', JSON.stringify(newPreferences));
    }
  }, [preferences, user]);

  /**
   * Reset to defaults
   */
  const resetPreferences = useCallback(async () => {
    setPreferences(DEFAULT_PREFERENCES);

    if (user) {
      // Reset via API
      const response = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threaded_view_enabled: DEFAULT_PREFERENCES.threadedViewEnabled,
          threaded_view_default_collapsed: DEFAULT_PREFERENCES.threadedViewDefaultCollapsed,
          language: DEFAULT_PREFERENCES.language,
          theme: DEFAULT_PREFERENCES.theme,
          density: DEFAULT_PREFERENCES.density,
          show_procedural_statements: DEFAULT_PREFERENCES.showProceduralStatements,
          default_hansard_filter: DEFAULT_PREFERENCES.defaultHansardFilter,
          statements_per_page: DEFAULT_PREFERENCES.statementsPerPage,
          email_notifications: DEFAULT_PREFERENCES.emailNotifications,
          push_notifications: DEFAULT_PREFERENCES.pushNotifications,
          has_seen_welcome: DEFAULT_PREFERENCES.has_seen_welcome,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error resetting preferences via API:', errorData.error);
      }
    } else {
      // Clear localStorage
      localStorage.removeItem('canadagpt_preferences');
    }
  }, [user]);

  const value = {
    preferences,
    loading,
    user,
    updatePreferences,
    resetPreferences,
  };

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

/**
 * Hook to access user preferences
 */
export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
}

/**
 * Hook to access just the threaded view preference
 */
export function useThreadedViewPreference() {
  const { preferences, updatePreferences } = useUserPreferences();

  return {
    enabled: preferences.threadedViewEnabled,
    defaultCollapsed: preferences.threadedViewDefaultCollapsed,
    setEnabled: (enabled: boolean) => updatePreferences({ threadedViewEnabled: enabled }),
    setDefaultCollapsed: (collapsed: boolean) => updatePreferences({ threadedViewDefaultCollapsed: collapsed }),
  };
}

/**
 * Hook for page-level threading toggle (combines global preference with local state)
 */
export function usePageThreading() {
  const { enabled: globalEnabled, setEnabled: setGlobalEnabled } = useThreadedViewPreference();
  const [localEnabled, setLocalEnabled] = useState<boolean | null>(null);

  // Use local override if set, otherwise use global preference
  const enabled = localEnabled !== null ? localEnabled : globalEnabled;

  const setEnabled = (value: boolean, updateGlobal = false) => {
    if (updateGlobal) {
      setGlobalEnabled(value);
      setLocalEnabled(null); // Clear local override
    } else {
      setLocalEnabled(value);
    }
  };

  const resetToGlobal = () => {
    setLocalEnabled(null);
  };

  return {
    enabled,
    setEnabled,
    resetToGlobal,
    isUsingLocalOverride: localEnabled !== null,
  };
}
