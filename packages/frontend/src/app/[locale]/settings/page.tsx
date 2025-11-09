/**
 * Unified Settings Page
 *
 * Combines profile display and account management with sidebar navigation
 */

'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { signIn } from 'next-auth/react';

type SettingsSection = 'profile' | 'account' | 'preferences' | 'usage' | 'subscription' | 'connected';

// Helper function to safely format dates
function formatDate(dateString: string | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!dateString) return 'Not available';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Not available';

    return date.toLocaleDateString('en-US', options || {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return 'Not available';
  }
}

export default function SettingsPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const { preferences, updatePreferences, loading: preferencesLoading } = useUserPreferences();
  const router = useRouter();
  const params = useParams();
  const currentLocale = params.locale as string;
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [imageError, setImageError] = useState(false);

  // Profile form state
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Not logged in</h1>
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            Sign in to access settings
          </Link>
        </div>
      </div>
    );
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      setProfileSuccess('Profile updated successfully');
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      setPasswordLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      setPasswordLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordSuccess('Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLanguageChange = async (newLanguage: 'en' | 'fr') => {
    // Update preference in database
    await updatePreferences({ language: newLanguage });

    // Redirect to new locale
    const currentPath = window.location.pathname;
    const pathWithoutLocale = currentPath.replace(`/${currentLocale}`, '');
    router.push(`/${newLanguage}${pathWithoutLocale || '/'}`);
  };

  const tierColors = {
    FREE: 'bg-gray-100 text-gray-800 border-gray-300',
    BASIC: 'bg-blue-100 text-blue-800 border-blue-300',
    PRO: 'bg-purple-100 text-purple-800 border-purple-300',
  };

  const tierNames = {
    FREE: 'Free Plan',
    BASIC: 'Basic Plan',
    PRO: 'Pro Plan',
  };

  const limits = {
    FREE: 10,
    BASIC: 200,
    PRO: 1000,
  };

  const limit = limits[profile.subscription_tier];
  const usage = profile.monthly_usage || 0;
  const remaining = Math.max(0, limit - usage);
  const usagePercentage = (usage / limit) * 100;

  const linkedProviders = (user as any).linkedProviders || [];
  const availableProviders = [
    { id: 'google', name: 'Google' },
    { id: 'github', name: 'GitHub' },
    { id: 'facebook', name: 'Facebook' },
    { id: 'linkedin', name: 'LinkedIn' },
  ];

  const navItems = [
    { id: 'profile' as const, label: 'Profile' },
    { id: 'account' as const, label: 'Account' },
    { id: 'preferences' as const, label: 'Preferences' },
    { id: 'usage' as const, label: 'Usage & Limits' },
    { id: 'subscription' as const, label: 'Subscription' },
    { id: 'connected' as const, label: 'Connected Accounts' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>

        {/* Page Header */}
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

        {/* Layout Container */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar Navigation - 1/3 width, sticky on desktop */}
          <aside className="w-full md:w-1/3 md:sticky md:top-6 md:self-start">
            <nav className="bg-white shadow rounded-lg p-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full text-left px-4 py-3 rounded-md transition-colors ${
                    activeSection === item.id
                      ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content Area - 2/3 width */}
          <main className="w-full md:w-2/3">
            {/* Profile Section */}
            {activeSection === 'profile' && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Profile</h2>

                {/* Avatar and Basic Info */}
                <div className="flex items-center space-x-4 mb-6 pb-6 border-b border-gray-200">
                  {profile.avatar_url && !imageError ? (
                    <div className="relative w-20 h-20">
                      <Image
                        src={profile.avatar_url}
                        alt={profile.full_name || 'User avatar'}
                        width={80}
                        height={80}
                        className="rounded-full object-cover"
                        onError={() => setImageError(true)}
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                      {profile.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {profile.full_name || 'User'}
                    </h3>
                    <p className="text-gray-500">{user.email}</p>
                  </div>
                </div>

                {/* Account Information */}
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{profile.full_name || 'Not set'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Member Since</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatDate(profile.created_at)}
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            {/* Account Section */}
            {activeSection === 'account' && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Account Settings</h2>

                <form onSubmit={handleUpdateProfile} className="space-y-4 mb-8 pb-8 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>

                  {profileSuccess && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-green-800 text-sm">{profileSuccess}</p>
                    </div>
                  )}
                  {profileError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-red-800 text-sm">{profileError}</p>
                    </div>
                  )}

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={user.email || ''}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {profileLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>

                {/* Password Change */}
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Change Password</h3>

                  {passwordSuccess && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-green-800 text-sm">{passwordSuccess}</p>
                    </div>
                  )}
                  {passwordError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-red-800 text-sm">{passwordError}</p>
                    </div>
                  )}

                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter new password"
                    />
                    <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Confirm new password"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            )}

            {/* Preferences Section */}
            {activeSection === 'preferences' && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Preferences</h2>

                {/* Language Preference */}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
                      Language / Langue
                    </label>
                    <select
                      id="language"
                      value={preferences.language}
                      onChange={(e) => handleLanguageChange(e.target.value as 'en' | 'fr')}
                      disabled={preferencesLoading}
                      className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value="en">English</option>
                      <option value="fr">Français</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-2">
                      Select your preferred language. The page will reload in the selected language.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Sélectionnez votre langue préférée. La page se rechargera dans la langue sélectionnée.
                    </p>
                  </div>

                  {/* Current Locale Display */}
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      <strong>Current locale:</strong> {currentLocale === 'en' ? 'English' : 'Français'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Usage & Limits Section */}
            {activeSection === 'usage' && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Usage & Limits</h2>

                {/* Current Tier */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Current Plan</h3>
                  <div className={`inline-block px-3 py-1 rounded-full border ${tierColors[profile.subscription_tier]}`}>
                    {tierNames[profile.subscription_tier]}
                  </div>
                </div>

                {/* Usage Statistics */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Usage This Month</h3>
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>{usage} / {limit} queries</span>
                      <span>{remaining} remaining</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          usagePercentage >= 90 ? 'bg-red-600' :
                          usagePercentage >= 70 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    Resets on {formatDate(profile.usage_reset_date)}
                  </p>
                </div>

                {profile.subscription_tier === 'FREE' && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <Link
                      href="/pricing"
                      className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Upgrade Plan
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Subscription Section */}
            {activeSection === 'subscription' && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Subscription</h2>

                <div className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {tierNames[profile.subscription_tier]}
                      </h3>
                      <p className="text-gray-600 mt-1">
                        {profile.subscription_tier === 'FREE' && '10 queries per day'}
                        {profile.subscription_tier === 'BASIC' && '200 queries per month - $9.99/month'}
                        {profile.subscription_tier === 'PRO' && '1000 queries per month + MCP access - $29.99/month'}
                      </p>
                    </div>
                    {profile.subscription_tier === 'FREE' && (
                      <Link
                        href="/pricing"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Upgrade
                      </Link>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Usage This Month</h4>
                  <p className="text-gray-600">
                    {profile.monthly_usage || 0} / {limit} queries used
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Resets on {formatDate(profile.usage_reset_date)}
                  </p>
                </div>

                {profile.subscription_tier !== 'FREE' && (
                  <div className="pt-4 border-t border-gray-200">
                    <button className="text-red-600 hover:text-red-700 text-sm font-medium">
                      Cancel Subscription
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Connected Accounts Section */}
            {activeSection === 'connected' && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Connected Accounts</h2>
                <p className="text-gray-600 mb-6">
                  Link multiple social accounts to your profile for easier sign-in.
                </p>

                <div className="space-y-3">
                  {availableProviders.map((provider) => {
                    const isLinked = linkedProviders.includes(provider.id);
                    return (
                      <div
                        key={provider.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="text-lg">{provider.name[0]}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{provider.name}</p>
                            {isLinked && (
                              <p className="text-sm text-green-600">Connected</p>
                            )}
                          </div>
                        </div>

                        {isLinked ? (
                          <button
                            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                            disabled
                          >
                            Disconnect
                          </button>
                        ) : (
                          <button
                            onClick={() => signIn(provider.id, { callbackUrl: '/settings' })}
                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                          >
                            Connect
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {linkedProviders.length > 1 && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      You have {linkedProviders.length} accounts connected. You can disconnect any account except your last one.
                    </p>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
