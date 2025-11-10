/**
 * MyMPSection Component
 *
 * Main "Find Your MP" section with authentication gating
 * Shows user's MP based on postal code or allows manual search
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Loader2, AlertCircle, User, MessageSquare, Vote, FileText } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useQuery } from '@apollo/client';
import { SEARCH_MPS, GET_MP } from '@/lib/queries';
import { PostalCodeInput } from './PostalCodeInput';
import { UnauthenticatedMPPrompt } from './UnauthenticatedMPPrompt';
import { normalizePostalCode } from '@/lib/postalCodeUtils';

interface MPData {
  id?: string;
  name: string;
  riding: string;
  party: string;
  email?: string;
  phone?: string;
  url?: string;
  offices?: Array<{
    type: string;
    tel: string;
    fax?: string;
    postal?: string;
  }>;
}

export function MyMPSection() {
  const t = useTranslations('mps.myMP');
  const { user, profile } = useAuth();

  const [postalCode, setPostalCode] = useState('');
  const [mpData, setMpData] = useState<MPData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Query to get MP directly by ID if preferred_mp_id exists
  const { data: preferredMpData, loading: preferredMpLoading } = useQuery(GET_MP, {
    variables: { id: profile?.preferred_mp_id },
    skip: !profile?.preferred_mp_id || !!mpData
  });

  // Query to get the correct database ID for the MP by name
  const { data: dbMpData } = useQuery(SEARCH_MPS, {
    variables: {
      searchTerm: mpData?.name || null,
      current: true,
      limit: 1
    },
    skip: !mpData?.name
  });

  // Function to update user's postal code and preferred MP in database
  const updateUserPostalCode = useCallback(async (pc: string, mpId?: string) => {
    try {
      // Update user profile with postal code and optionally MP ID
      const response = await fetch('/api/user/update-postal-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postal_code: pc,
          ...(mpId && { preferred_mp_id: mpId })
        })
      });

      if (!response.ok) {
        console.error('Failed to update postal code');
      }
    } catch (err) {
      console.error('Error updating postal code:', err);
    }
  }, []);

  // Update MP ID when we get the database response
  useEffect(() => {
    if (dbMpData?.searchMPs?.[0]?.id) {
      const mpId = dbMpData.searchMPs[0].id;

      setMpData(prev => {
        // Only update if the ID is different
        if (prev && prev.id !== mpId) {
          return { ...prev, id: mpId };
        }
        return prev;
      });

      // Save MP ID to user profile
      if (user && profile && mpId !== profile.preferred_mp_id) {
        updateUserPostalCode(postalCode, mpId);
      }
    }
  }, [dbMpData, user, profile, postalCode, updateUserPostalCode]);

  // Load preferred MP from database if available
  useEffect(() => {
    if (preferredMpData?.mps?.[0] && !mpData) {
      const mp = preferredMpData.mps[0];
      setMpData({
        id: mp.id,
        name: mp.name,
        riding: mp.riding,
        party: mp.party,
        email: mp.email,
        photo_url: mp.photo_url,
        phone: mp.phone,
        url: mp.ourcommons_url
      });
    }
  }, [preferredMpData, mpData]);

  // Auto-load MP data if user has postal code in profile (fallback if no preferred_mp_id)
  useEffect(() => {
    if (profile?.postal_code && !mpData && !profile?.preferred_mp_id && !preferredMpLoading) {
      setPostalCode(profile.postal_code);
      fetchMPByPostalCode(profile.postal_code);
    }
  }, [profile?.postal_code, profile?.preferred_mp_id, mpData, preferredMpLoading]);

  const fetchMPByPostalCode = async (pc: string) => {
    setLoading(true);
    setError('');

    try {
      const normalized = normalizePostalCode(pc);
      const response = await fetch(`/api/represent?postalCode=${normalized}`);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(t('errors.genericError'));
        }
        if (response.status === 404) {
          throw new Error(t('errors.notFound'));
        }
        throw new Error(t('errors.genericError'));
      }

      const data = await response.json();

      // Extract House of Commons MP from representatives
      const mp = data.representatives?.find(
        (rep: any) => rep.representative_set_name === 'House of Commons'
      );

      if (!mp) {
        throw new Error(t('errors.notFound'));
      }

      setMpData({
        id: mp.external_id || mp.url?.split('/').pop(),
        name: mp.name,
        riding: mp.district_name,
        party: mp.party_name,
        email: mp.email,
        photo_url: mp.photo_url,
        phone: mp.phone,
        url: mp.url,
        offices: mp.offices
      });

      // Save postal code to user profile if authenticated
      if (user && profile && pc !== profile.postal_code) {
        await updateUserPostalCode(pc);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.genericError'));
      setMpData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setError(t('errors.geolocationUnavailable'));
      return;
    }

    setLoading(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(`/api/represent?lat=${latitude}&lng=${longitude}`);

          if (!response.ok) {
            throw new Error(t('errors.genericError'));
          }

          const data = await response.json();

          const mp = data.representatives?.find(
            (rep: any) => rep.representative_set_name === 'House of Commons'
          );

          if (!mp) {
            throw new Error(t('errors.notFound'));
          }

          setMpData({
            id: mp.external_id || mp.url?.split('/').pop(),
            name: mp.name,
            riding: mp.district_name,
            party: mp.party_name,
            email: mp.email,
            photo_url: mp.photo_url,
            phone: mp.phone,
            url: mp.url,
            offices: mp.offices
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : t('errors.genericError'));
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError(t('errors.geolocationDenied'));
        } else {
          setError(t('errors.geolocationUnavailable'));
        }
      }
    );
  };

  // If user is not authenticated, show sign-up prompt
  if (!user) {
    return <UnauthenticatedMPPrompt />;
  }

  // If MP data is loaded, show the MP card
  if (mpData && !isExpanded) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-6">
        <div className="flex items-start gap-6">
          {/* Left Column: MP Photo + Details */}
          <div className="flex items-start gap-4 flex-1">
            {/* MP Photo */}
            {mpData.photo_url && (
              <img
                src={mpData.photo_url}
                alt={mpData.name}
                className="w-24 h-40 rounded-lg object-contain flex-shrink-0 bg-white/50 dark:bg-gray-800/50"
              />
            )}

            {/* MP Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">
                  {t('yourMPBadge')}
                </span>
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                {mpData.name}
              </h3>

              <p className="text-gray-700 dark:text-gray-300 mb-3">
                {mpData.party} • {mpData.riding}
              </p>

              {/* Contact Information */}
              <div className="space-y-1 text-sm">
                {mpData.email && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <a
                      href={`mailto:${mpData.email}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {mpData.email}
                    </a>
                  </div>
                )}

                {mpData.phone && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <a
                      href={`tel:${mpData.phone}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {mpData.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Constituency Office */}
          {mpData.offices && mpData.offices.length > 0 && (
            <div className="flex-shrink-0 w-64 px-6 border-l border-gray-200 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Constituency Office</p>
              {mpData.offices.map((office, idx) => (
                <div key={idx} className="space-y-2">
                  {office.tel && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <a href={`tel:${office.tel}`} className="text-blue-600 dark:text-blue-400 hover:underline text-base">
                        {office.tel}
                      </a>
                    </div>
                  )}
                  {office.postal && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">{office.postal}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Change Button */}
          <button
            onClick={() => setIsExpanded(true)}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-md transition-colors flex-shrink-0"
          >
            Change
          </button>
        </div>

        {/* Action Buttons */}
        {mpData.id && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/mps/${mpData.id}` as any}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                <User className="w-4 h-4" />
                View Profile
              </Link>
              <Link
                href={`/mps/${mpData.id}#speeches` as any}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Speeches
              </Link>
              <Link
                href={`/mps/${mpData.id}#votes` as any}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 transition-colors"
              >
                <Vote className="w-4 h-4" />
                Votes
              </Link>
              <Link
                href={`/mps/${mpData.id}#legislation` as any}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Bills
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show search form
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('findYourMP')}
        </h3>
      </div>

      <p className="text-gray-600 dark:text-gray-400 mb-4">
        {t('enterPostalCode')}
      </p>

      {/* Postal Code Input */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1">
          <PostalCodeInput
            value={postalCode}
            onChange={setPostalCode}
            onValidPostalCode={fetchMPByPostalCode}
            disabled={loading}
            error={error}
          />
        </div>
        <button
          onClick={() => fetchMPByPostalCode(postalCode)}
          disabled={loading || !postalCode}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-md transition-colors disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            'Find'
          )}
        </button>
      </div>

      {/* Use Location Button */}
      <button
        onClick={handleUseLocation}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <MapPin className="w-4 h-4" />
        {t('useMyLocation')}
      </button>

      {/* Error Message */}
      {error && !loading && (
        <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="mt-4 flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>{t('loading')}</span>
        </div>
      )}
    </div>
  );
}
