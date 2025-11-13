/**
 * Unified Settings Page
 *
 * Combines profile display and account management with sidebar navigation
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Key, CheckCircle, XCircle, Loader2, User, Search } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useQuery } from '@apollo/client';
import { SEARCH_MPS } from '@/lib/queries';

type SettingsSection = 'profile' | 'account' | 'preferences' | 'usage' | 'subscription' | 'connected' | 'api-keys' | 'gordie' | 'my-mp';

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
  const [postalCode, setPostalCode] = useState(profile?.postal_code || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // API Keys state
  const [apiKeys, setApiKeys] = useState<{
    provider: 'anthropic' | 'openai' | 'canlii';
    is_active: boolean;
    last_validated_at: string | null;
  }[]>([]);
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [apiKeyLoading, setApiKeyLoading] = useState<Record<string, boolean>>({});
  const [apiKeyErrors, setApiKeyErrors] = useState<Record<string, string>>({});
  const [apiKeySuccess, setApiKeySuccess] = useState<Record<string, string>>({});

  // Gordie custom prompt state
  const [gordiePrompt, setGordiePrompt] = useState(preferences?.custom_gordie_prompt || '');
  const [gordieLoading, setGordieLoading] = useState(false);
  const [gordieSuccess, setGordieSuccess] = useState('');
  const [gordieError, setGordieError] = useState('');

  // MP selection state
  const [mpSearchTerm, setMpSearchTerm] = useState('');
  const [mpLoading, setMpLoading] = useState(false);
  const [mpSuccess, setMpSuccess] = useState('');
  const [mpError, setMpError] = useState('');

  // Query to search for MPs
  const { data: mpSearchData, loading: mpSearchLoading } = useQuery(SEARCH_MPS, {
    variables: {
      searchTerm: mpSearchTerm,
      current: true,
      limit: 20
    },
    skip: !mpSearchTerm || mpSearchTerm.length < 2
  });

  // Fetch API keys on mount - MUST be before early returns
  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        const response = await fetch('/api/user/api-keys');
        if (response.ok) {
          const data = await response.json();
          setApiKeys(data.keys || []);
        }
      } catch (error) {
        console.error('Failed to fetch API keys:', error);
      }
    };

    if (user) {
      fetchApiKeys();
    }
  }, [user]);

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
        .update({
          full_name: fullName,
          postal_code: postalCode || null
        })
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

  // Save API key
  const handleSaveApiKey = async (provider: 'anthropic' | 'openai' | 'canlii') => {
    const apiKey = apiKeyInputs[provider];
    if (!apiKey || apiKey.trim().length === 0) {
      setApiKeyErrors({ ...apiKeyErrors, [provider]: 'API key is required' });
      return;
    }

    setApiKeyLoading({ ...apiKeyLoading, [provider]: true });
    setApiKeyErrors({ ...apiKeyErrors, [provider]: '' });
    setApiKeySuccess({ ...apiKeySuccess, [provider]: '' });

    try {
      // Validate first
      const validateResponse = await fetch('/api/user/api-keys/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey }),
      });

      if (!validateResponse.ok) {
        const validateData = await validateResponse.json();
        throw new Error(validateData.error || 'Invalid API key');
      }

      // Save after validation
      const saveResponse = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey }),
      });

      if (!saveResponse.ok) {
        const saveData = await saveResponse.json();
        throw new Error(saveData.error || 'Failed to save API key');
      }

      // Refresh API keys list
      const fetchResponse = await fetch('/api/user/api-keys');
      if (fetchResponse.ok) {
        const data = await fetchResponse.json();
        setApiKeys(data.keys || []);
      }

      setApiKeySuccess({ ...apiKeySuccess, [provider]: 'API key saved successfully!' });
      setApiKeyInputs({ ...apiKeyInputs, [provider]: '' }); // Clear input

      // Clear success message after 5 seconds
      setTimeout(() => {
        setApiKeySuccess(prev => ({ ...prev, [provider]: '' }));
      }, 5000);
    } catch (error: any) {
      setApiKeyErrors({ ...apiKeyErrors, [provider]: error.message });
    } finally {
      setApiKeyLoading({ ...apiKeyLoading, [provider]: false });
    }
  };

  // Delete API key
  const handleDeleteApiKey = async (provider: 'anthropic' | 'openai' | 'canlii') => {
    if (!confirm(`Are you sure you want to remove your ${provider} API key?`)) {
      return;
    }

    setApiKeyLoading({ ...apiKeyLoading, [provider]: true });

    try {
      const response = await fetch(`/api/user/api-keys?provider=${provider}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete API key');
      }

      // Refresh API keys list
      const fetchResponse = await fetch('/api/user/api-keys');
      if (fetchResponse.ok) {
        const data = await fetchResponse.json();
        setApiKeys(data.keys || []);
      }

      setApiKeySuccess({ ...apiKeySuccess, [provider]: 'API key removed successfully!' });
    } catch (error: any) {
      setApiKeyErrors({ ...apiKeyErrors, [provider]: error.message });
    } finally {
      setApiKeyLoading({ ...apiKeyLoading, [provider]: false });
    }
  };

  // Save Gordie custom prompt
  const handleSaveGordiePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    setGordieLoading(true);
    setGordieError('');
    setGordieSuccess('');

    try {
      await updatePreferences({ custom_gordie_prompt: gordiePrompt });
      setGordieSuccess('Custom prompt saved successfully!');
    } catch (error: any) {
      setGordieError(error.message || 'Failed to save custom prompt');
    } finally {
      setGordieLoading(false);
    }
  };

  const handleSelectMP = async (mpId: string, mpName: string) => {
    setMpLoading(true);
    setMpError('');
    setMpSuccess('');

    try {
      const response = await fetch('/api/user/update-postal-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferred_mp_id: mpId })
      });

      if (!response.ok) {
        throw new Error('Failed to update preferred MP');
      }

      await refreshProfile();
      setMpSuccess(`Successfully set ${mpName} as your preferred MP!`);
      setMpSearchTerm('');
    } catch (error: any) {
      setMpError(error.message || 'Failed to update preferred MP');
    } finally {
      setMpLoading(false);
    }
  };

  const tierColors: Record<string, string> = {
    FREE: 'bg-gray-100 text-gray-800 border-gray-300',
    BASIC: 'bg-blue-100 text-blue-800 border-blue-300',
    PRO: 'bg-purple-100 text-purple-800 border-purple-300',
  };

  const tierNames: Record<string, string> = {
    FREE: 'Free Plan',
    BASIC: 'Basic Plan',
    PRO: 'Pro Plan',
  };

  const limits: Record<string, number> = {
    FREE: 10,
    BASIC: 200,
    PRO: 1000,
  };

  // Safely get subscription tier with fallback to FREE
  const subscriptionTier = profile.subscription_tier || 'FREE';
  const limit = limits[subscriptionTier] || limits['FREE'];
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
    { id: 'my-mp' as const, label: 'My MP' },
    { id: 'preferences' as const, label: 'Preferences' },
    { id: 'usage' as const, label: 'Usage & Limits' },
    { id: 'subscription' as const, label: 'Subscription' },
    { id: 'connected' as const, label: 'Connected Accounts' },
    { id: 'api-keys' as const, label: 'API Keys' },
    { id: 'gordie' as const, label: 'Gordie Settings' },
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

                  <div>
                    <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
                      Postal Code (Optional)
                    </label>
                    <input
                      type="text"
                      id="postalCode"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
                      placeholder="K1A 0A9"
                      maxLength={7}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Used to show your local MP on the MPs page
                    </p>
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

            {/* My MP Section */}
            {activeSection === 'my-mp' && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">My MP</h2>
                <p className="text-gray-600 mb-6">
                  Select your Member of Parliament. This will be displayed on the MPs page and used for personalized content.
                </p>

                {/* Currently Selected MP */}
                {profile.preferred_mp_id && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium text-gray-900">Current MP</p>
                          <p className="text-sm text-gray-600">ID: {profile.preferred_mp_id}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setMpSuccess('');
                          setMpError('');
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                )}

                {/* Search for MP */}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="mpSearch" className="block text-sm font-medium text-gray-700 mb-2">
                      Search for an MP
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        id="mpSearch"
                        value={mpSearchTerm}
                        onChange={(e) => setMpSearchTerm(e.target.value)}
                        placeholder="Search by name, party, or riding..."
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Type at least 2 characters to search
                    </p>
                  </div>

                  {/* Success/Error Messages */}
                  {mpSuccess && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-green-800 text-sm">{mpSuccess}</p>
                    </div>
                  )}
                  {mpError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-red-800 text-sm">{mpError}</p>
                    </div>
                  )}

                  {/* Search Results */}
                  {mpSearchTerm.length >= 2 && (
                    <div className="border border-gray-200 rounded-md max-h-96 overflow-y-auto">
                      {mpSearchLoading ? (
                        <div className="p-4 text-center text-gray-500">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                          Searching MPs...
                        </div>
                      ) : mpSearchData?.searchMPs && mpSearchData.searchMPs.length > 0 ? (
                        <div className="divide-y divide-gray-200">
                          {mpSearchData.searchMPs.map((mp: any) => (
                            <button
                              key={mp.id}
                              onClick={() => handleSelectMP(mp.id, mp.name)}
                              disabled={mpLoading}
                              className="w-full p-4 text-left hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{mp.name}</p>
                                  <p className="text-sm text-gray-600">
                                    {mp.party} • {mp.riding}
                                  </p>
                                </div>
                                {profile.preferred_mp_id === mp.id && (
                                  <CheckCircle className="w-5 h-5 text-green-600 ml-2" />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          No MPs found matching "{mpSearchTerm}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
                      className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <div className={`inline-block px-3 py-1 rounded-full border ${tierColors[subscriptionTier]}`}>
                    {tierNames[subscriptionTier]}
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

                {subscriptionTier === 'FREE' && (
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
                        {tierNames[subscriptionTier]}
                      </h3>
                      <p className="text-gray-600 mt-1">
                        {subscriptionTier === 'FREE' && '10 queries (lifetime)'}
                        {subscriptionTier === 'BASIC' && '200 queries per month - $6.99/month'}
                        {subscriptionTier === 'PRO' && '1000 queries per month + MCP access - $29.99/month'}
                      </p>
                    </div>
                    {subscriptionTier === 'FREE' && (
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

                {subscriptionTier !== 'FREE' && (
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

            {/* API Keys Section */}
            {activeSection === 'api-keys' && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">API Keys</h2>
                <p className="text-gray-600 mb-6">
                  Connect your own API keys to enable unlimited queries on your subscription plan.
                  Your keys are encrypted and stored securely.
                </p>

                {/* Anthropic Claude */}
                <div className="mb-8 pb-8 border-b border-gray-200">
                  <div className="flex items-center gap-3 mb-4">
                    <Key className="w-6 h-6 text-gray-700" />
                    <h3 className="text-lg font-medium text-gray-900">Anthropic Claude</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Get your API key from{' '}
                    <a
                      href="https://console.anthropic.com/settings/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Anthropic Console
                    </a>
                  </p>

                  {/* Success/Error messages - shown for all states */}
                  {apiKeyErrors.anthropic && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800">{apiKeyErrors.anthropic}</p>
                    </div>
                  )}
                  {apiKeySuccess.anthropic && (
                    <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-800">{apiKeySuccess.anthropic}</p>
                    </div>
                  )}

                  {apiKeys.find((k) => k.provider === 'anthropic' && k.is_active) ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-green-800">Connected</span>
                      </div>
                      <button
                        onClick={() => handleDeleteApiKey('anthropic')}
                        disabled={apiKeyLoading.anthropic}
                        className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50"
                      >
                        {apiKeyLoading.anthropic ? 'Removing...' : 'Remove Key'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <input
                        type="password"
                        value={apiKeyInputs.anthropic || ''}
                        onChange={(e) =>
                          setApiKeyInputs({ ...apiKeyInputs, anthropic: e.target.value })
                        }
                        placeholder="sk-ant-..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        onClick={() => handleSaveApiKey('anthropic')}
                        disabled={apiKeyLoading.anthropic}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {apiKeyLoading.anthropic && <Loader2 className="w-4 h-4 animate-spin" />}
                        {apiKeyLoading.anthropic ? 'Validating...' : 'Save & Test'}
                      </button>
                    </div>
                  )}
                </div>

                {/* OpenAI */}
                <div className="mb-8 pb-8 border-b border-gray-200">
                  <div className="flex items-center gap-3 mb-4">
                    <Key className="w-6 h-6 text-gray-700" />
                    <h3 className="text-lg font-medium text-gray-900">OpenAI</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Get your API key from{' '}
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      OpenAI Platform
                    </a>
                  </p>

                  {/* Success/Error messages - shown for all states */}
                  {apiKeyErrors.openai && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800">{apiKeyErrors.openai}</p>
                    </div>
                  )}
                  {apiKeySuccess.openai && (
                    <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-800">{apiKeySuccess.openai}</p>
                    </div>
                  )}

                  {apiKeys.find((k) => k.provider === 'openai' && k.is_active) ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-green-800">Connected</span>
                      </div>
                      <button
                        onClick={() => handleDeleteApiKey('openai')}
                        disabled={apiKeyLoading.openai}
                        className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50"
                      >
                        {apiKeyLoading.openai ? 'Removing...' : 'Remove Key'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <input
                        type="password"
                        value={apiKeyInputs.openai || ''}
                        onChange={(e) =>
                          setApiKeyInputs({ ...apiKeyInputs, openai: e.target.value })
                        }
                        placeholder="sk-..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        onClick={() => handleSaveApiKey('openai')}
                        disabled={apiKeyLoading.openai}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {apiKeyLoading.openai && <Loader2 className="w-4 h-4 animate-spin" />}
                        {apiKeyLoading.openai ? 'Validating...' : 'Save & Test'}
                      </button>
                    </div>
                  )}
                </div>

                {/* CanLII */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Key className="w-6 h-6 text-gray-700" />
                    <h3 className="text-lg font-medium text-gray-900">CanLII</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Request your API key from{' '}
                    <a
                      href="https://www.canlii.org/en/feedback/feedback.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      CanLII Feedback Form
                    </a>
                  </p>

                  {/* Success/Error messages - shown for all states */}
                  {apiKeyErrors.canlii && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800">{apiKeyErrors.canlii}</p>
                    </div>
                  )}
                  {apiKeySuccess.canlii && (
                    <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-800">{apiKeySuccess.canlii}</p>
                    </div>
                  )}

                  {apiKeys.find((k) => k.provider === 'canlii' && k.is_active) ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-green-800">Connected</span>
                      </div>
                      <button
                        onClick={() => handleDeleteApiKey('canlii')}
                        disabled={apiKeyLoading.canlii}
                        className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50"
                      >
                        {apiKeyLoading.canlii ? 'Removing...' : 'Remove Key'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <input
                        type="password"
                        value={apiKeyInputs.canlii || ''}
                        onChange={(e) =>
                          setApiKeyInputs({ ...apiKeyInputs, canlii: e.target.value })
                        }
                        placeholder="Your CanLII API key"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        onClick={() => handleSaveApiKey('canlii')}
                        disabled={apiKeyLoading.canlii}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {apiKeyLoading.canlii && <Loader2 className="w-4 h-4 animate-spin" />}
                        {apiKeyLoading.canlii ? 'Validating...' : 'Save & Test'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Gordie Settings Section */}
            {activeSection === 'gordie' && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Gordie Settings</h2>
                <p className="text-gray-600 mb-6">
                  Customize how Gordie interacts with you. You can provide a custom prompt that will be included when Gordie responds to your questions.
                </p>

                <form onSubmit={handleSaveGordiePrompt} className="space-y-4">
                  <div>
                    <label htmlFor="gordiePrompt" className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Prompt for Gordie
                    </label>
                    <textarea
                      id="gordiePrompt"
                      value={gordiePrompt}
                      onChange={(e) => setGordiePrompt(e.target.value)}
                      rows={6}
                      placeholder="Example: Focus on environmental policy when discussing bills. Provide historical context for major legislation. Always mention relevant statistics when available."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      This prompt will be added to Gordie's instructions. Use it to guide the tone, focus areas, or type of information you'd like emphasized.
                    </p>
                  </div>

                  {gordieSuccess && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-green-800 text-sm">{gordieSuccess}</p>
                    </div>
                  )}
                  {gordieError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-red-800 text-sm">{gordieError}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={gordieLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {gordieLoading ? 'Saving...' : 'Save Custom Prompt'}
                    </button>
                    {gordiePrompt && (
                      <button
                        type="button"
                        onClick={() => {
                          setGordiePrompt('');
                          handleSaveGordiePrompt(new Event('submit') as any);
                        }}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Clear Prompt
                      </button>
                    )}
                  </div>
                </form>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">Tips for Custom Prompts:</h3>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Be specific about topics you're interested in (e.g., "climate policy", "indigenous rights")</li>
                    <li>Request particular types of context (e.g., "historical background", "economic impact")</li>
                    <li>Specify the tone you prefer (e.g., "casual and conversational", "formal and academic")</li>
                    <li>Mention if you want comparisons (e.g., "compare to similar bills", "show party differences")</li>
                  </ul>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
