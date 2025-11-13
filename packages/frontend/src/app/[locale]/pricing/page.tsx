/**
 * Pricing Page
 *
 * Displays subscription tier options with BYOK (Bring Your Own Key) toggle
 * Allows users to select between self-managed API keys or managed usage with credits
 */

'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, X, Key, CreditCard } from 'lucide-react';

export default function PricingPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [useBYOK, setUseBYOK] = useState(true); // Toggle for BYOK vs +Usage
  const [selectedPlan, setSelectedPlan] = useState<'FREE' | 'BASIC' | 'PRO'>('BASIC');

  // Define pricing based on BYOK mode
  const getPricing = (tier: 'BASIC' | 'PRO') => {
    if (useBYOK) {
      return tier === 'BASIC' ? 6.99 : 19.99;
    } else {
      return tier === 'BASIC' ? 14.99 : 39.99;
    }
  };

  const plans = [
    {
      id: 'FREE' as const,
      name: 'Free',
      price: 0,
      period: 'forever',
      description: 'Perfect for exploring parliamentary data',
      features: [
        '10 queries (lifetime)',
        'Access to parliamentary data',
        'Browse MPs and bills',
        'Read news articles',
        'View discussions (read-only)',
        'Basic search functionality',
      ],
      limitations: [
        'No bookmarks',
        'Cannot post or reply',
        'No export functionality',
        'No advanced features',
      ],
      cta: 'Current Plan',
      highlighted: false,
      showBetaBadge: false,
    },
    {
      id: 'BASIC' as const,
      name: 'Basic',
      price: getPricing('BASIC'),
      period: 'month',
      description: 'Great for regular users and researchers',
      features: [
        '200 queries per month',
        'Full parliamentary data access',
        'Up to 100 bookmarks',
        'Create 10 collections',
        'Post discussions & replies',
        'Advanced search & filters',
        'Export to CSV/JSON',
        'Email support',
        'Usage analytics',
      ],
      limitations: [
        'No MCP server access',
        'No API access',
        'No AI-powered insights',
      ],
      cta: 'Join Beta',
      highlighted: true,
      showBetaBadge: true,
    },
    {
      id: 'PRO' as const,
      name: 'Pro',
      price: getPricing('PRO'),
      period: 'month',
      description: 'For power users and developers',
      features: [
        '1,000 queries per month',
        'Full parliamentary data access',
        'Unlimited bookmarks & collections',
        'MCP server access',
        'API access for integrations',
        'AI-powered insights',
        'Bookmark sidebar',
        'Share collections publicly',
        'Priority support',
        'Advanced analytics',
        'Export to all formats',
      ],
      limitations: [],
      cta: 'Join Beta',
      highlighted: false,
      showBetaBadge: true,
    },
  ];

  const handleSelectPlan = async (planId: 'FREE' | 'BASIC' | 'PRO') => {
    if (!user) {
      router.push('/auth/signup');
      return;
    }

    if (profile?.subscription_tier === planId) {
      router.push('/settings');
      return;
    }

    if (planId === 'FREE') {
      alert('You are already on a free plan or above.');
      return;
    }

    // Create Stripe checkout session for beta signup
    try {
      setSelectedPlan(planId);

      const response = await fetch('/api/stripe/create-setup-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier: planId,
          useBYOK: useBYOK,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Failed to start beta signup. Please try again or contact support.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Access Canadian parliamentary data with the plan that fits your needs
          </p>
        </div>

        {/* Beta Notice */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <p className="text-blue-800 font-medium">
              We're in beta! Join now to get PRO features at discounted rates. No charges during beta period.
            </p>
          </div>
        </div>

        {/* BYOK Toggle */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center">
                <Key className="h-5 w-5 text-gray-600 mr-2" />
                <span className={`font-medium ${useBYOK ? 'text-blue-600' : 'text-gray-600'}`}>
                  Bring Your Own API Key
                </span>
              </div>

              <button
                onClick={() => setUseBYOK(!useBYOK)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  useBYOK ? 'bg-blue-600' : 'bg-gray-600'
                }`}
                role="switch"
                aria-checked={!useBYOK}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    useBYOK ? 'translate-x-1' : 'translate-x-7'
                  }`}
                />
              </button>

              <div className="flex items-center">
                <CreditCard className="h-5 w-5 text-gray-600 mr-2" />
                <span className={`font-medium ${!useBYOK ? 'text-blue-600' : 'text-gray-600'}`}>
                  We Handle Usage
                </span>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600 text-center">
              {useBYOK ? (
                <p>
                  Save money by providing your own Anthropic API key. You pay Anthropic directly for AI usage.
                </p>
              ) : (
                <p>
                  We manage API costs for you. Prepay credits and we charge you for your actual Claude API usage.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Current Plan Indicator */}
        {user && profile && (
          <div className="text-center mb-8">
            <p className="text-sm text-gray-600">
              Current plan:{' '}
              <span className="font-semibold text-blue-600">
                {profile.subscription_tier === 'FREE' && 'Free'}
                {profile.subscription_tier === 'BASIC' && 'Basic'}
                {profile.subscription_tier === 'PRO' && 'Pro'}
              </span>
              {profile.subscription_tier !== 'FREE' && (
                <span className="ml-2">
                  ({profile.uses_own_key ? 'BYOK' : '+Usage'})
                </span>
              )}
            </p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => {
            const isCurrentPlan = profile?.subscription_tier === plan.id;
            const isFree = plan.id === 'FREE';

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-lg shadow-lg overflow-hidden ${
                  plan.highlighted
                    ? 'ring-2 ring-blue-600 transform scale-105'
                    : 'border border-gray-200'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 text-sm font-semibold rounded-bl-lg">
                    Most Popular
                  </div>
                )}

                {plan.showBetaBadge && (
                  <div className="absolute top-0 left-0 bg-green-500 text-white px-3 py-1 text-xs font-semibold rounded-br-lg">
                    BETA
                  </div>
                )}

                <div className="p-8">
                  {/* Plan Header */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                    {!isFree && !useBYOK && (
                      <span className="text-sm font-normal text-gray-600 ml-2">
                        + Usage
                      </span>
                    )}
                  </h3>
                  <p className="text-gray-600 mb-4">{plan.description}</p>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline">
                      <span className="text-5xl font-extrabold text-gray-900">
                        ${plan.price.toFixed(2)}
                      </span>
                      <span className="ml-2 text-gray-600">
                        /{plan.period}
                      </span>
                    </div>
                    {!isFree && (
                      <p className="text-xs text-gray-500 mt-2">
                        {useBYOK
                          ? 'Plus your Anthropic API costs'
                          : 'Plus actual API usage charged monthly'}
                      </p>
                    )}
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={isCurrentPlan}
                    className={`w-full py-3 px-6 rounded-md font-semibold transition-colors mb-6 ${
                      isCurrentPlan
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : plan.highlighted
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : isFree
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {isCurrentPlan ? 'Current Plan' : plan.cta}
                  </button>

                  {/* Features */}
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                      Included:
                    </p>
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </div>
                    ))}

                    {plan.limitations.length > 0 && (
                      <>
                        <p className="text-sm font-semibold text-gray-900 uppercase tracking-wide mt-4">
                          Not included:
                        </p>
                        {plan.limitations.map((limitation, index) => (
                          <div key={index} className="flex items-start">
                            <X className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-500 text-sm">{limitation}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What's the difference between BYOK and +Usage plans?
              </h3>
              <p className="text-gray-600">
                BYOK (Bring Your Own Key) plans let you use your own Anthropic API key, which you pay for directly.
                +Usage plans mean we handle the API costs for you - you prepay credits and we charge you for your actual
                Claude API usage.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Will I be charged during the beta period?
              </h3>
              <p className="text-gray-600">
                No! During beta, we'll collect payment information but won't charge you. Beta testers get PRO tier
                features for free during the beta period. We'll notify you well before any billing begins.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I switch between BYOK and +Usage plans?
              </h3>
              <p className="text-gray-600">
                Yes! You can switch between BYOK and +Usage modes at any time. Changes take effect immediately,
                and we'll prorate any billing adjustments.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What happens if I exceed my query limit?
              </h3>
              <p className="text-gray-600">
                For FREE tier, you'll need to upgrade once you've used your 10 lifetime queries. For paid tiers,
                if you reach your monthly limit, you'll be notified and can upgrade your plan or wait until your
                limit resets at the start of the next month.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How do credits work for +Usage plans?
              </h3>
              <p className="text-gray-600">
                For +Usage plans, you prepay for credits in your account. Each AI query deducts the cost of the
                actual Claude API usage (input + output tokens). You'll get low balance warnings
                and can recharge anytime.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Is there a free trial for paid plans?
              </h3>
              <p className="text-gray-600">
                The Free plan allows you to explore CanadaGPT's features with 10 lifetime queries.
                This serves as a trial period to help you decide which paid plan fits your needs.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">
            Need a custom plan or have questions?
          </p>
          <Link
            href="/contact"
            className="inline-block px-6 py-3 bg-gray-900 text-white rounded-md font-semibold hover:bg-gray-800 transition-colors"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
