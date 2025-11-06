/**
 * Root layout for CanadaGPT
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ApolloWrapper } from '@/components/ApolloWrapper';
import { AuthProvider } from '@/contexts/AuthContext';
import { ChatWidget } from '@/components/chat';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CanadaGPT - Government Accountability',
  description: 'Track Canadian MPs, bills, lobbying, and government spending with transparency and accountability.',
  keywords: 'Canada, government, accountability, MPs, bills, lobbying, transparency',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`}>
        <AuthProvider>
          <ApolloWrapper>
            {children}
            <ChatWidget />
          </ApolloWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
