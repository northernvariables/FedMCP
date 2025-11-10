/**
 * Next.js Middleware - Internationalization & Route Protection
 *
 * Handles locale detection/routing and protects authenticated routes
 * Uses NextAuth for authentication
 * Runs on Edge Runtime for fast response times
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale, localePrefix, pathnames } from './i18n/config';
import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';

// Routes that require authentication (without locale prefix)
const protectedRoutes = [
  '/profile',
  '/account',
  '/chat', // AI chat will require authentication
];

// Routes that should redirect to home if already authenticated
const authRoutes = ['/auth/login', '/auth/signup'];

// Create the internationalization middleware
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix,
  pathnames,
  localeDetection: true,
});

// Edge-compatible auth config (minimal, without database/crypto operations)
const authConfig: NextAuthConfig = {
  providers: [],
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
};

const { auth } = NextAuth(authConfig);

export async function middleware(request: NextRequest) {
  // First, handle internationalization
  const intlResponse = intlMiddleware(request);

  // Get the locale from the pathname
  const pathname = request.nextUrl.pathname;
  const pathnameLocale = locales.find(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // Remove locale prefix for route checking
  const pathnameWithoutLocale = pathnameLocale
    ? pathname.slice(`/${pathnameLocale}`.length) || '/'
    : pathname;

  // Get NextAuth session (from JWT, no database access)
  const session = await auth();

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathnameWithoutLocale.startsWith(route)
  );

  // Check if route is an auth page
  const isAuthRoute = authRoutes.some((route) =>
    pathnameWithoutLocale.startsWith(route)
  );

  // Redirect to login if accessing protected route without session
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL(
      `/${pathnameLocale || defaultLocale}/auth/login`,
      request.url
    );
    redirectUrl.searchParams.set('next', pathnameWithoutLocale);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect to home if accessing auth pages while already logged in
  if (isAuthRoute && session) {
    return NextResponse.redirect(
      new URL(`/${pathnameLocale || defaultLocale}/`, request.url)
    );
  }

  return intlResponse;
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    // Enable for all paths
    '/',
    // Enable for locale paths
    '/(fr|en)/:path*',
    // Match all request paths except for:
    // - API routes
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico and other static assets
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
