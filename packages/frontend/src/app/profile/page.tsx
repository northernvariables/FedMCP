/**
 * User Profile Page
 *
 * Displays user information, subscription tier, and usage statistics
 */

'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, profile, loading } = useAuth();

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
            Sign in to view your profile
          </Link>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {profile.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {profile.full_name || 'User'}
                </h1>
                <p className="text-gray-500">{user.email}</p>
              </div>
            </div>
            <Link
              href="/account"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Account Settings
            </Link>
          </div>
        </div>

        {/* Subscription Info */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Subscription</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className={`inline-block px-3 py-1 rounded-full border ${tierColors[profile.subscription_tier]}`}>
                {tierNames[profile.subscription_tier]}
              </div>
              <p className="text-gray-600 mt-2">
                {profile.subscription_tier === 'FREE' && 'Get started with basic features'}
                {profile.subscription_tier === 'BASIC' && '200 queries per month'}
                {profile.subscription_tier === 'PRO' && '1000 queries per month + MCP access'}
              </p>
            </div>
            {profile.subscription_tier === 'FREE' && (
              <Link
                href="/pricing"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Upgrade Plan
              </Link>
            )}
          </div>
        </div>

        {/* Usage Statistics */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Usage This Month</h2>
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
            Resets on {new Date(profile.usage_reset_date).toLocaleDateString()}
          </p>
        </div>

        {/* Account Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
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
                {new Date(profile.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </dd>
            </div>
            {profile.api_key && (
              <div>
                <dt className="text-sm font-medium text-gray-500">API Key</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded border border-gray-200">
                  {profile.api_key}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
