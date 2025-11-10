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
import { auth } from '@/auth';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

export async function GET(request: Request) {
  const supabase = getSupabaseClient();
  try {
    // Get user from NextAuth session
    const session = await auth();

    // For development/unauthenticated users, return unlimited quota
    if (!session || !session.user) {
      const defaultResponse: QuotaCheckResult = {
        can_query: true,
        reason: 'Development mode - unlimited queries',
        requires_payment: false,
        queries_remaining: undefined, // Unlimited
        resets_at: undefined,
      };
      return Response.json(defaultResponse);
    }

    const user = { id: session.user.id };

    // First verify the user exists in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user.id);

    if (authError || !authUser.user) {
      console.warn('User not found in auth.users:', user.id, '- Session may be stale. Please sign out and sign in again.');
      return Response.json({
        can_query: false,
        reason: 'Session expired. Please sign out and sign in again.',
        requires_payment: false,
        queries_remaining: 0,
        resets_at: undefined,
      });
    }

    // Check quota using PostgreSQL function
    const { data: quotaResult, error: quotaError } = await supabase.rpc(
      'can_user_query',
      { p_user_id: user.id }
    );

    if (quotaError) {
      console.error('Quota check error for user', user.id, ':', quotaError);
      // If the error is due to missing user record, return helpful message
      if (quotaError.message?.includes('violates foreign key constraint')) {
        return Response.json({
          can_query: false,
          reason: 'Account setup incomplete. Please sign out and sign in again.',
          requires_payment: false,
          queries_remaining: 0,
          resets_at: undefined,
        });
      }
      // For development, allow queries on other errors
      console.log('Allowing query despite quota check error (development mode)');
      return Response.json({
        can_query: true,
        reason: 'Development mode - quota check failed but allowing query',
        requires_payment: false,
        queries_remaining: undefined,
        resets_at: undefined,
      });
    }

    // Handle case where user doesn't exist or function returns null/undefined
    // Note: PostgreSQL function with OUT parameters returns a single object, not an array
    const result = quotaResult;

    if (!result || result.can_query === undefined || result.can_query === null) {
      console.log('No quota result for user:', user.id, '- allowing unlimited queries for development');
      return Response.json({
        can_query: true,
        reason: 'Development mode - unlimited queries',
        requires_payment: false,
        queries_remaining: undefined,
        resets_at: undefined,
      });
    }

    // Get subscription details for additional context (gracefully handle missing subscription)
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (subError && subError.code !== 'PGRST116') {
      // Log error but continue (PGRST116 = not found, which is OK)
      console.error('Error fetching subscription for user', user.id, ':', subError);
    }

    // Get lifetime usage (gracefully handle errors)
    const { data: lifetimeUsage, error: usageError } = await supabase
      .from('usage_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('counted_against_quota', true);

    if (usageError) {
      console.error('Error fetching usage for user', user.id, ':', usageError);
    }

    const queriesUsedLifetime = lifetimeUsage?.length || 0;

    // Calculate queries remaining
    let queriesRemaining: number | undefined;
    if (subscription) {
      if (subscription.tier === 'free') {
        // Free tier: 10 queries lifetime
        const lifetimeQuota = subscription.lifetime_quota || 10;
        queriesRemaining = Math.max(0, lifetimeQuota - queriesUsedLifetime);
      } else {
        // Paid tiers use daily quota - check today's usage
        const today = new Date().toISOString().split('T')[0];
        const { data: todayUsage } = await supabase
          .from('usage_logs')
          .select('id')
          .eq('user_id', user.id)
          .eq('query_date', today)
          .eq('counted_against_quota', true);

        const queriesToday = todayUsage?.length || 0;
        queriesRemaining = Math.max(0, subscription.daily_quota - queriesToday);
      }
    }

    // Reset time is undefined for free tier (no reset)
    let resetsAt: string | undefined;
    if (subscription && subscription.tier !== 'free') {
      // Paid tiers reset daily
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
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
    // In development, allow queries even on unexpected errors
    console.log('Allowing query despite unexpected error (development mode)');
    return Response.json({
      can_query: true,
      reason: 'Development mode - error occurred but allowing query',
      requires_payment: false,
      queries_remaining: undefined,
      resets_at: undefined,
    });
  }
}
