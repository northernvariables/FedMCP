/**
 * Quota Check API Route
 *
 * Returns the current quota status for the authenticated user:
 * - Can the user make a query?
 * - If not, why? (quota exceeded, payment required, etc.)
 * - How many queries remaining?
 * - When does quota reset?
 */

import { createClient } from '@supabase/supabase-js';
import type { QuotaCheckResult } from '@/lib/types/chat';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET(request: Request) {
  try {
    // Get user from Supabase auth
    const authHeader = request.headers.get('authorization');

    // For development/unauthenticated users, return unlimited quota
    if (!authHeader) {
      const defaultResponse: QuotaCheckResult = {
        can_query: true,
        reason: 'Development mode - unlimited queries',
        requires_payment: false,
        queries_remaining: undefined, // Unlimited
        resets_at: undefined,
      };
      return Response.json(defaultResponse);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      // Return unlimited quota for unauthenticated users in development
      const defaultResponse: QuotaCheckResult = {
        can_query: true,
        reason: 'Development mode - unlimited queries',
        requires_payment: false,
        queries_remaining: undefined,
        resets_at: undefined,
      };
      return Response.json(defaultResponse);
    }

    // Check quota using PostgreSQL function
    const { data: quotaResult, error: quotaError } = await supabase.rpc(
      'can_user_query',
      { p_user_id: user.id }
    );

    if (quotaError) {
      console.error('Quota check error:', quotaError);
      return Response.json(
        { error: 'Failed to check quota' },
        { status: 500 }
      );
    }

    const result = quotaResult[0];

    // Get subscription details for additional context
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Get today's usage
    const today = new Date().toISOString().split('T')[0];
    const { data: todayUsage } = await supabase
      .from('usage_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('query_date', today)
      .eq('counted_against_quota', true);

    const queriesUsedToday = todayUsage?.length || 0;

    // Calculate queries remaining
    let queriesRemaining: number | undefined;
    if (subscription) {
      if (subscription.tier === 'free') {
        // Free tier uses lifetime quota
        queriesRemaining = Math.max(0, (subscription.lifetime_quota || 0) - queriesUsedToday);
      } else {
        // Paid tiers use daily quota
        queriesRemaining = Math.max(0, subscription.daily_quota - queriesUsedToday);
      }
    }

    // Calculate reset time (midnight UTC for daily quotas)
    let resetsAt: string | undefined;
    if (subscription && subscription.tier !== 'free') {
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);
      resetsAt = tomorrow.toISOString();
    }

    const response: QuotaCheckResult = {
      can_query: result.can_query,
      reason: result.reason,
      requires_payment: result.requires_payment,
      queries_remaining: queriesRemaining,
      resets_at: resetsAt,
    };

    return Response.json(response);
  } catch (error) {
    console.error('Quota API error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
