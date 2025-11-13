/**
 * NextAuth Type Extensions
 *
 * Extends default NextAuth types with custom user properties
 */

import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      subscriptionTier: string;
      monthlyUsage: number;
      createdAt?: string;
      usageResetDate?: string;
      linkedProviders?: string[];
      isBetaTester?: boolean;
      usesOwnKey?: boolean;
      creditBalance?: number;
      preferredMpId?: string | null;
      postalCode?: string | null;
      showMyMpSection?: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    subscriptionTier?: string;
    monthlyUsage?: number;
    createdAt?: string;
    usageResetDate?: string;
    linkedProviders?: string[];
    isBetaTester?: boolean;
    usesOwnKey?: boolean;
    creditBalance?: number;
    preferredMpId?: string | null;
    postalCode?: string | null;
    showMyMpSection?: boolean;
  }
}
