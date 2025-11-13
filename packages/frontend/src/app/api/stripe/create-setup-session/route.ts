/**
 * Stripe Setup Session Endpoint
 *
 * Creates a Stripe Checkout Session in setup mode to collect payment method
 * without charging the user. Used for beta signups.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import Stripe from 'stripe';
import { createServerClient as createClient } from '@/lib/supabase-server';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

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
    const { tier, useBYOK } = await request.json();

    // Validate tier
    if (!['BASIC', 'PRO'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid tier. Must be BASIC or PRO.' },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const supabase = await createClient();
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id, email, full_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
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

      // Save customer ID to database
      await supabase
        .from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // Create Checkout Session in setup mode
    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'setup',
      payment_method_types: ['card'],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing/beta-success?session_id={CHECKOUT_SESSION_ID}&tier=${tier}&byok=${useBYOK}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: {
        user_id: userId,
        tier,
        uses_own_key: useBYOK ? 'true' : 'false',
      },
      billing_address_collection: 'auto',
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error('Stripe setup session error:', error);
    return NextResponse.json(
      { error: 'Failed to create setup session' },
      { status: 500 }
    );
  }
}
