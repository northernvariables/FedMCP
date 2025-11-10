/**
 * Locale-specific layout for CanadaGPT
 * Handles internationalization and provides locale context
 */

// Force dynamic rendering for all pages due to auth/cookies/search params
export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ApolloWrapper } from '@/components/ApolloWrapper';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { UserPreferencesProvider } from '@/contexts/UserPreferencesContext';
import { ChatWidgetWrapper } from '@/components/chat';
import { ContentWrapper } from '@/components/ContentWrapper';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { locales } from '@/i18n/config';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://canadagpt.ca';

  return {
    title: {
      default: t('title'),
      template: `%s | ${t('title')}`
    },
    description: t('description'),
    keywords: t('keywords'),
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        'en': '/en',
        'fr': '/fr',
      },
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: `${baseUrl}/${locale}`,
      siteName: 'CanadaGPT',
      locale: locale === 'fr' ? 'fr_CA' : 'en_CA',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // Validate locale
  if (!locales.includes(locale as any)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Get translations for this locale
  const messages = await getMessages();

  return (
    <html lang={locale} className="h-full">
      <body className={`${inter.className} h-full`}>
        <ErrorBoundary>
          <NextIntlClientProvider messages={messages}>
            <SessionProvider>
              <AuthProvider>
                <UserPreferencesProvider>
                  <ApolloWrapper>
                    <ContentWrapper>
                      {children}
                    </ContentWrapper>
                    <ChatWidgetWrapper />
                  </ApolloWrapper>
                </UserPreferencesProvider>
              </AuthProvider>
            </SessionProvider>
          </NextIntlClientProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
