/**
 * Credits Balance API
 *
 * GET: Returns user's current credit balance and recent transactions
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerClient as createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const supabase = await createClient();

    // Get current balance
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('credit_balance, subscription_tier, uses_own_key')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    // Get recent transactions (last 50)
    const { data: transactions, error: transactionsError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (transactionsError) {
      console.error('Failed to fetch transactions:', transactionsError);
    }

    return NextResponse.json({
      balance: profile.credit_balance || 0,
      subscriptionTier: profile.subscription_tier,
      usesOwnKey: profile.uses_own_key,
      transactions: transactions || [],
      lowBalanceWarning: profile.credit_balance < 5.00, // Warn if below $5
    });
  } catch (error) {
    console.error('Credits API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credits' },
      { status: 500 }
    );
  }
}
