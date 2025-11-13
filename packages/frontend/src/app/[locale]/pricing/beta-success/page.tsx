/**
 * Beta Signup Success Page
 *
 * Displayed after successful Stripe setup completion
 * Welcomes beta testers and explains next steps
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Key, CreditCard, ArrowRight } from 'lucide-react';

function BetaSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  const tier = searchParams.get('tier') || 'PRO';
  const byok = searchParams.get('byok') === 'true';
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Simulate a brief loading period to allow webhook to process
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing your beta signup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to the Beta!
          </h1>
          <p className="text-xl text-gray-600">
            You're all set with PRO tier access
          </p>
        </div>

        {/* Beta Details Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Your Beta Access Details
          </h2>

          <div className="space-y-4">
            <div className="flex items-start">
              <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">PRO Tier Features Unlocked</h3>
                <p className="text-gray-600">
                  You now have access to all PRO features including 1,000 queries per month,
                  MCP server access, API access, and AI-powered insights.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">No Charges During Beta</h3>
                <p className="text-gray-600">
                  We've saved your payment method but won't charge you during the beta period.
                  We'll notify you well in advance before any billing begins.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              {byok ? (
                <Key className="h-6 w-6 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
              ) : (
                <CreditCard className="h-6 w-6 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <h3 className="font-semibold text-gray-900">
                  {byok ? 'BYOK Plan Selected' : '+Usage Plan Selected'}
                </h3>
                <p className="text-gray-600">
                  {byok
                    ? "You'll use your own Anthropic API key for AI queries. Head to Settings to add your API key."
                    : "We'll handle API costs for you. After beta, you'll prepay for credits that get charged for your actual Claude API usage."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Next Steps</h2>
          <ol className="space-y-3">
            {byok && (
              <li className="flex items-start">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold mr-3">
                  1
                </span>
                <div>
                  <p className="text-gray-900 font-medium">Add your Anthropic API key</p>
                  <p className="text-gray-600 text-sm">
                    Go to Settings → API Keys to configure your Anthropic API key
                  </p>
                </div>
              </li>
            )}
            <li className="flex items-start">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold mr-3">
                {byok ? '2' : '1'}
              </span>
              <div>
                <p className="text-gray-900 font-medium">Start exploring parliamentary data</p>
                <p className="text-gray-600 text-sm">
                  Use Gordie, our AI assistant, to search bills, debates, MPs, and more
                </p>
              </div>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold mr-3">
                {byok ? '3' : '2'}
              </span>
              <div>
                <p className="text-gray-900 font-medium">Share your feedback</p>
                <p className="text-gray-600 text-sm">
                  As a beta tester, your feedback is invaluable. Let us know what works and what doesn't!
                </p>
              </div>
            </li>
          </ol>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {byok && (
            <Link
              href="/settings"
              className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition-colors"
            >
              <Key className="h-5 w-5 mr-2" />
              Add API Key
              <ArrowRight className="h-5 w-5 ml-2" />
            </Link>
          )}
          <Link
            href="/chat"
            className="inline-flex items-center justify-center px-6 py-3 bg-gray-900 text-white rounded-md font-semibold hover:bg-gray-800 transition-colors"
          >
            Start Using CanadaGPT
            <ArrowRight className="h-5 w-5 ml-2" />
          </Link>
        </div>

        {/* Session ID for debugging */}
        {sessionId && (
          <div className="mt-8 text-center text-xs text-gray-400">
            Session ID: {sessionId}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BetaSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <BetaSuccessContent />
    </Suspense>
  );
}
