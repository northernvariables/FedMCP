/**
 * AuthContext - Global Authentication State Management
 *
 * Provides authentication state and methods throughout the app
 * Uses NextAuth for session management
 */

'use client';

import { createContext, useContext } from 'react';
import { useSession, signOut as nextAuthSignOut } from 'next-auth/react';

interface UserProfile {
  id: string;
  email: string;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  subscription_tier?: string;
  monthly_usage?: number;
  created_at?: string;
  usage_reset_date?: string;
  postal_code?: string | null;
  preferred_mp_id?: string | null;
  is_beta_tester?: boolean;
  uses_own_key?: boolean;
  credit_balance?: number;
  show_my_mp_section?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  profile: UserProfile | null; // Kept for backward compatibility
  session: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const loading = status === 'loading';

  // Map NextAuth session to user profile format
  const user: UserProfile | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email!,
        full_name: session.user.name,
        display_name: session.user.name,
        avatar_url: session.user.image,
        subscription_tier: session.user.subscriptionTier,
        monthly_usage: session.user.monthlyUsage,
        created_at: session.user.createdAt,
        usage_reset_date: session.user.usageResetDate,
        postal_code: session.user.postalCode,
        preferred_mp_id: session.user.preferredMpId,
        is_beta_tester: session.user.isBetaTester,
        uses_own_key: session.user.usesOwnKey,
        credit_balance: session.user.creditBalance,
        show_my_mp_section: session.user.showMyMpSection,
      }
    : null;

  // Sign out using NextAuth
  const signOut = async () => {
    try {
      await nextAuthSignOut({ redirect: false });
      // Force a hard reload to clear all state
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
      // Force reload even if there's an error
      window.location.href = '/';
    }
  };

  // Refresh profile data (re-fetch session)
  const refreshProfile = async () => {
    // NextAuth v5 automatically refreshes session
    // Can trigger manual refresh if needed
    window.location.reload();
  };

  const value = {
    user,
    profile: user, // Alias for backward compatibility
    session,
    loading,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
