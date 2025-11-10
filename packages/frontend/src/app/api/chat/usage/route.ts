/**
 * Usage Stats API Route
 *
 * Returns detailed usage statistics for the authenticated user:
 * - Queries today
 * - Queries this month
 * - Tokens used today
 * - Cost incurred today
 * - Current overage amount
 */

import { createClient } from '@supabase/supabase-js';
import type { UsageStats } from '@/lib/types/chat';
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

    // For development/unauthenticated users, return default stats
    if (!session || !session.user) {
      const defaultResponse: UsageStats = {
        queries_today: 0,
        queries_this_month: 0,
        tokens_today: 0,
        cost_today: 0,
        overage_amount: 0,
      };
      return Response.json(defaultResponse);
    }

    const user = { id: session.user.id };

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Get first day of current month (UTC to match quota logic)
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().split('T')[0];

    // Queries today (counted against quota)
    const { data: todayQueries } = await supabase
      .from('usage_logs')
      .select('tokens_total, cost_usd')
      .eq('user_id', user.id)
      .eq('query_date', today)
      .eq('counted_against_quota', true);

    const queriesToday = todayQueries?.length || 0;
    const tokensToday = todayQueries?.reduce((sum, q) => sum + (q.tokens_total || 0), 0) || 0;
    const costToday = todayQueries?.reduce((sum, q) => sum + (q.cost_usd || 0), 0) || 0;

    // Queries this month (counted against quota)
    const { data: monthQueries } = await supabase
      .from('usage_logs')
      .select('id')
      .eq('user_id', user.id)
      .gte('query_date', monthStart)
      .eq('counted_against_quota', true);

    const queriesThisMonth = monthQueries?.length || 0;

    // Get subscription for overage amount
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('current_overage_amount')
      .eq('user_id', user.id)
      .single();

    const overageAmount = subscription?.current_overage_amount || 0;

    const response: UsageStats = {
      queries_today: queriesToday,
      queries_this_month: queriesThisMonth,
      tokens_today: tokensToday,
      cost_today: costToday,
      overage_amount: overageAmount,
    };

    return Response.json(response);
  } catch (error) {
    console.error('Usage API error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
