/**
 * UserMenu Component
 *
 * Displays user authentication status, profile info, and subscription tier
 * Shows login/signup buttons when not authenticated
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

export function UserMenu() {
  const { user, profile, loading, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center space-x-2">
        <Link
          href="/auth/login"
          className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          Sign In
        </Link>
        <Link
          href="/auth/signup"
          className="px-4 py-2 text-sm font-medium text-white bg-accent-red rounded-md hover:bg-accent-red-hover transition-colors"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  const tierColors = {
    FREE: 'bg-bg-elevated text-text-secondary',
    BASIC: 'bg-accent-red/10 text-accent-red',
    PRO: 'bg-accent-red/20 text-accent-red',
  };

  const tierLabels = {
    FREE: 'Free',
    BASIC: 'Basic',
    PRO: 'Pro',
  };

  const subscriptionTier = (profile?.subscription_tier as keyof typeof tierColors) || 'FREE';
  const tierColor = tierColors[subscriptionTier];
  const tierLabel = tierLabels[subscriptionTier];

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center space-x-3 focus:outline-none focus:ring-2 focus:ring-accent-red rounded-md p-2 hover:bg-bg-elevated transition-colors"
      >
        <div className="flex items-center space-x-2">
          {profile?.avatar_url && !imageError ? (
            <div className="relative w-8 h-8">
              <Image
                src={profile.avatar_url}
                alt={profile.full_name || 'User avatar'}
                width={32}
                height={32}
                className="rounded-full object-cover"
                onError={() => setImageError(true)}
                unoptimized
              />
            </div>
          ) : (
            <div className="w-8 h-8 bg-accent-red rounded-full flex items-center justify-center text-white font-medium">
              {profile?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-text-primary">
              {profile?.full_name || 'User'}
            </p>
            {profile && (
              <p className={`text-xs px-2 py-0.5 rounded-full inline-block ${tierColor}`}>
                {tierLabel}
              </p>
            )}
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-text-secondary transition-transform ${
            menuOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-bg-secondary rounded-md shadow-lg py-1 z-20 border border-border-subtle">
            <div className="px-4 py-2 border-b border-border-subtle">
              <p className="text-sm font-medium text-text-primary">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs text-text-secondary truncate">{user.email}</p>
              {profile && (
                <div className="mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${tierColor}`}>
                    {tierLabel}
                  </span>
                  <p className="text-xs text-text-tertiary mt-1">
                    {profile.monthly_usage || 0} / {
                      subscriptionTier === 'FREE' ? 10 :
                      subscriptionTier === 'BASIC' ? 200 : 1000
                    } queries
                  </p>
                </div>
              )}
            </div>

            <Link
              href="/settings"
              className="block px-4 py-2 text-sm text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Settings
            </Link>

            {subscriptionTier === 'FREE' && (
              <Link
                href="/pricing"
                className="block px-4 py-2 text-sm text-accent-red hover:bg-accent-red/10 border-t border-border-subtle transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                Upgrade Plan
              </Link>
            )}

            <button
              onClick={() => {
                setMenuOpen(false);
                signOut();
              }}
              className="block w-full text-left px-4 py-2 text-sm text-accent-red hover:bg-accent-red/10 border-t border-border-subtle transition-colors"
            >
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
