/**
 * Authentication Error Page
 *
 * Displays authentication errors from OAuth providers or other auth failures
 */

'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const errorMessages: Record<string, { title: string; description: string }> = {
  Configuration: {
    title: 'Configuration Error',
    description: 'There is a problem with the server configuration. Please contact support if this persists.',
  },
  AccessDenied: {
    title: 'Access Denied',
    description: 'You do not have permission to sign in.',
  },
  Verification: {
    title: 'Verification Error',
    description: 'The verification token has expired or has already been used.',
  },
  OAuthSignin: {
    title: 'OAuth Sign-In Error',
    description: 'Error occurred while trying to sign in with the OAuth provider.',
  },
  OAuthCallback: {
    title: 'OAuth Callback Error',
    description: 'Error occurred during the OAuth callback process.',
  },
  OAuthCreateAccount: {
    title: 'Account Creation Error',
    description: 'Could not create an account with the OAuth provider.',
  },
  EmailCreateAccount: {
    title: 'Email Account Error',
    description: 'Could not create an email account.',
  },
  Callback: {
    title: 'Callback Error',
    description: 'Error occurred during the authentication callback.',
  },
  OAuthAccountNotLinked: {
    title: 'Account Not Linked',
    description: 'This email is already associated with another sign-in method. Please use your original sign-in method.',
  },
  EmailSignin: {
    title: 'Email Sign-In Error',
    description: 'Failed to send verification email. Please try again.',
  },
  CredentialsSignin: {
    title: 'Sign-In Error',
    description: 'Invalid email or password. Please try again.',
  },
  SessionRequired: {
    title: 'Session Required',
    description: 'Please sign in to access this page.',
  },
  Default: {
    title: 'Authentication Error',
    description: 'An unexpected error occurred during authentication. Please try again.',
  },
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'Default';

  const errorInfo = errorMessages[error] || errorMessages.Default;

  return (
    <div className="space-y-6">
      <div className="p-6 bg-red-50 border border-red-200 rounded-md">
        <h2 className="text-xl font-semibold text-red-900 mb-2">
          {errorInfo.title}
        </h2>
        <p className="text-red-700">
          {errorInfo.description}
        </p>
        {error !== 'Default' && (
          <p className="text-sm text-red-600 mt-3">
            Error code: {error}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <Link
          href="/auth/login"
          className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Try Again
        </Link>

        <Link
          href="/"
          className="block w-full text-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
        >
          Back to Home
        </Link>
      </div>

      <div className="text-center text-sm text-gray-600">
        <p>Need help?</p>
        <Link href="/contact" className="text-blue-600 hover:underline">
          Contact Support
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white py-8 px-6 shadow-lg rounded-lg">
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Oops!
            </h1>
            <p className="text-gray-600">
              Something went wrong
            </p>
          </div>

          <Suspense fallback={<div>Loading...</div>}>
            <ErrorContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
