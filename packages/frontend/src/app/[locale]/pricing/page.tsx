/**
 * Pricing Page
 *
 * Displays subscription tier options and pricing
 * Allows users to select and upgrade their plan
 */

'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, X } from 'lucide-react';

export default function PricingPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<'FREE' | 'BASIC' | 'PRO'>('BASIC');

  const plans = [
    {
      id: 'FREE' as const,
      name: 'Free',
      price: 0,
      period: 'forever',
      description: 'Perfect for trying out CanadaGPT',
      features: [
        '10 queries per day',
        'Access to parliamentary data',
        'Basic search functionality',
        'Community support',
      ],
      limitations: [
        'No API access',
        'No advanced analytics',
        'Limited export options',
      ],
      cta: 'Current Plan',
      highlighted: false,
    },
    {
      id: 'BASIC' as const,
      name: 'Basic',
      price: 6.99,
      period: 'month',
      description: 'Great for regular users and researchers',
      features: [
        '200 queries per month',
        'Full parliamentary data access',
        'Advanced search & filters',
        'Export to CSV/JSON',
        'Email support',
        'Usage analytics',
      ],
      limitations: [
        'No MCP server access',
        'No priority support',
      ],
      cta: 'Upgrade to Basic',
      highlighted: true,
    },
    {
      id: 'PRO' as const,
      name: 'Pro',
      price: 29.99,
      period: 'month',
      description: 'For power users and developers',
      features: [
        '1,000 queries per month',
        'Full parliamentary data access',
        'MCP server access',
        'API access',
        'Priority support',
        'Advanced analytics',
        'Custom integrations',
        'Export to all formats',
      ],
      limitations: [],
      cta: 'Upgrade to Pro',
      highlighted: false,
    },
  ];

  const handleSelectPlan = (planId: 'FREE' | 'BASIC' | 'PRO') => {
    if (!user) {
      router.push('/auth/signup');
      return;
    }

    if (profile?.subscription_tier === planId) {
      router.push('/settings');
      return;
    }

    // TODO: Implement payment flow
    setSelectedPlan(planId);
    alert(`Upgrading to ${planId} plan - Payment integration coming soon!`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Access Canadian parliamentary data with the plan that fits your needs
          </p>
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
                  <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 text-sm font-semibold">
                    Most Popular
                  </div>
                )}

                <div className="p-8">
                  {/* Plan Header */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
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
                        <span className="text-gray-700">{feature}</span>
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
                            <span className="text-gray-500">{limitation}</span>
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
                Can I change my plan at any time?
              </h3>
              <p className="text-gray-600">
                Yes! You can upgrade or downgrade your plan at any time. Changes will be prorated
                and reflected in your next billing cycle.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600">
                We accept all major credit cards (Visa, Mastercard, American Express) and PayPal.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What happens if I exceed my query limit?
              </h3>
              <p className="text-gray-600">
                If you reach your monthly query limit, you'll be notified and given the option to
                upgrade your plan or wait until your limit resets at the start of the next month.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Is there a free trial for paid plans?
              </h3>
              <p className="text-gray-600">
                The Free plan allows you to explore CanadaGPT's features with 10 queries per day.
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
