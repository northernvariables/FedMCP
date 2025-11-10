/**
 * QuotaDisplay Component
 *
 * Shows current quota status:
 * - Queries remaining
 * - Upgrade prompts
 * - Warning states
 * - BYOK indicator
 */

'use client';

import React from 'react';
import { AlertCircle, Zap, Key } from 'lucide-react';
import { useChatQuota } from '@/lib/stores/chatStore';

export function QuotaDisplay() {
  const { quotaStatus, usageStats } = useChatQuota();

  if (!quotaStatus) {
    return null;
  }

  const { can_query, queries_remaining, reason } = quotaStatus;

  // BYOK users have unlimited queries
  const hasUnlimited = queries_remaining === undefined || queries_remaining > 1000;

  // Warning states
  const isLow = queries_remaining !== undefined && queries_remaining <= 3 && queries_remaining > 0;
  const isExceeded = !can_query;

  return (
    <div className="px-4 py-2 border-b border-gray-700 bg-gray-800">
      <div className="flex items-center justify-between">
        {/* Quota status */}
        <div className="flex items-center gap-2">
          {hasUnlimited ? (
            <>
              <Key className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-green-700">
                Unlimited (BYOK)
              </span>
            </>
          ) : isExceeded ? (
            <>
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-xs font-medium text-red-700">
                Quota exceeded
              </span>
            </>
          ) : isLow ? (
            <>
              <AlertCircle className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-medium text-orange-700">
                {queries_remaining} queries left
              </span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 text-accent-red" />
              <span className="text-xs font-medium text-gray-400">
                {queries_remaining} queries remaining
              </span>
            </>
          )}
        </div>
      </div>

      {/* Warning message */}
      {(isLow || isExceeded) && (
        <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-md">
          <p className="text-xs text-orange-800">
            {reason}
          </p>
          <button className="mt-1 text-xs font-medium text-accent-red hover:underline">
            Upgrade or add BYOK for unlimited
          </button>
        </div>
      )}
    </div>
  );
}
