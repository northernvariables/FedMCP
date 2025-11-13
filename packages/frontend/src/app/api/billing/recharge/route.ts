/**
 * Credits Recharge API
 *
 * POST: Creates a Stripe Payment Intent to add credits to user account
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import Stripe from 'stripe';
import { createServerClient as createClient } from '@/lib/supabase-server';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

// Predefined recharge amounts (in USD)
const RECHARGE_AMOUNTS = {
  small: 10.00,
  medium: 25.00,
  large: 50.00,
  xlarge: 100.00,
};

export async function POST(request: NextRequest) {
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
    const { amount } = await request.json();

    // Validate amount
    const validAmounts = Object.values(RECHARGE_AMOUNTS);
    if (!validAmounts.includes(amount)) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be one of: 10, 25, 50, 100' },
        { status: 400 }
      );
    }

    // Get user profile
    const supabase = await createClient();
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id, email, full_name, uses_own_key')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    // Check if user is on +Usage plan
    if (profile.uses_own_key) {
      return NextResponse.json(
        { error: 'BYOK users do not need to purchase credits' },
        { status: 400 }
      );
    }

    let customerId = profile.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: profile.email || session.user.email!,
        name: profile.full_name || session.user.name || undefined,
        metadata: {
          user_id: userId,
        },
      });
      customerId = customer.id;

      // Save customer ID
      await supabase
        .from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // Create Payment Intent
    const paymentIntent = await getStripe().paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: customerId,
      metadata: {
        user_id: userId,
        type: 'credit_recharge',
        credit_amount: amount.toString(),
      },
      description: `CanadaGPT Credit Recharge - $${amount.toFixed(2)}`,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
    });
  } catch (error) {
    console.error('Recharge API error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
