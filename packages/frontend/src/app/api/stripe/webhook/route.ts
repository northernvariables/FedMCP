/**
 * Stripe Webhook Handler
 *
 * Processes Stripe webhook events, specifically:
 * - checkout.session.completed: Updates user subscription tier after successful setup
 * - setup_intent.succeeded: Records payment method setup
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Create Supabase client with service role for webhook (bypass RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case 'setup_intent.succeeded': {
        const setupIntent = event.data.object as Stripe.SetupIntent;
        await handleSetupIntentSucceeded(setupIntent);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    const userId = session.metadata?.user_id;
    const tier = session.metadata?.tier;
    const usesOwnKey = session.metadata?.uses_own_key === 'true';

    if (!userId || !tier) {
      console.error('Missing metadata in checkout session:', session.id);
      return;
    }

    // Update user profile with beta tester status and subscription tier
    const { error } = await supabase
      .from('user_profiles')
      .update({
        is_beta_tester: true,
        subscription_tier: 'PRO', // All beta testers get PRO tier
        uses_own_key: usesOwnKey,
        stripe_setup_intent_id: session.setup_intent as string,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Failed to update user profile:', error);
    } else {
      console.log(`Beta signup completed for user ${userId}: ${tier} tier, BYOK=${usesOwnKey}`);
    }
  } catch (error) {
    console.error('Error handling checkout.session.completed:', error);
  }
}

async function handleSetupIntentSucceeded(setupIntent: Stripe.SetupIntent) {
  try {
    const customerId = setupIntent.customer as string;

    // Get user ID from customer
    const customer = await getStripe().customers.retrieve(customerId);
    if (!customer || customer.deleted) {
      console.error('Customer not found:', customerId);
      return;
    }

    const userId = customer.metadata?.user_id;
    if (!userId) {
      console.error('No user_id in customer metadata:', customerId);
      return;
    }

    // Record the setup intent ID
    await supabase
      .from('user_profiles')
      .update({
        stripe_setup_intent_id: setupIntent.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    console.log(`Setup intent succeeded for user ${userId}:`, setupIntent.id);
  } catch (error) {
    console.error('Error handling setup_intent.succeeded:', error);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    // Check if this is a credit recharge
    if (paymentIntent.metadata?.type !== 'credit_recharge') {
      console.log('Not a credit recharge, ignoring');
      return;
    }

    const userId = paymentIntent.metadata?.user_id;
    const creditAmount = parseFloat(paymentIntent.metadata?.credit_amount || '0');

    if (!userId || !creditAmount) {
      console.error('Missing metadata in payment intent:', paymentIntent.id);
      return;
    }

    // Add credits using the SQL function
    const { data, error } = await supabase.rpc('add_credits', {
      p_user_id: userId,
      p_amount: creditAmount,
      p_stripe_charge_id: paymentIntent.id,
      p_description: `Credit recharge via Stripe - $${creditAmount.toFixed(2)}`,
    });

    if (error) {
      console.error('Failed to add credits:', error);
    } else {
      console.log(`Added $${creditAmount} credits for user ${userId}. New balance: $${data}`);
    }
  } catch (error) {
    console.error('Error handling payment_intent.succeeded:', error);
  }
}
