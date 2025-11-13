/**
 * NextAuth v5 Configuration
 *
 * Handles authentication with multiple OAuth providers and credentials.
 * Manages user profiles, accounts, and session data.
 */

import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import Facebook from 'next-auth/providers/facebook';
import LinkedIn from 'next-auth/providers/linkedin';
import Credentials from 'next-auth/providers/credentials';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { encryptToken } from '@/lib/encryption';

export const {auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
    LinkedIn({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid profile email',
        },
      },
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        // Check if user exists in database
        const { data: profile, error } = await (getSupabaseAdmin()
          .from('user_profiles') as any)
          .select('*')
          .eq('email', credentials.email as string)
          .single();

        if (error || !profile) {
          throw new Error('Invalid credentials');
        }

        // Use Supabase auth for password verification
        const { data: authData, error: authError } = await getSupabaseAdmin().auth.signInWithPassword({
          email: credentials.email as string,
          password: credentials.password as string,
        });

        if (authError || !authData.user) {
          throw new Error('Invalid credentials');
        }

        return {
          id: profile.id,
          email: profile.email,
          name: profile.full_name || profile.display_name,
          image: profile.avatar_url,
        };
      },
    }),
  ],
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user, account, profile: oauthProfile }) {
      // Initial sign in
      if (user) {
        // Create or update profile
        const { data: existingProfile } = await (getSupabaseAdmin()
          .from('user_profiles') as any)
          .select('*')
          .eq('email', user.email!)
          .maybeSingle();

        let userId: string;

        if (!existingProfile) {
          // Check if auth.users already has a user with this email
          const { data: { users: existingAuthUsers } } = await getSupabaseAdmin().auth.admin.listUsers();
          const existingAuthUser = existingAuthUsers?.find(u => u.email === user.email);

          let authUserId: string;

          if (existingAuthUser) {
            // Use existing auth user ID
            authUserId = existingAuthUser.id;
            console.log(`Using existing auth user ID ${authUserId} for ${user.email}`);
          } else {
            // Create user in Supabase Auth first
            const { data: authUser, error: authError } = await getSupabaseAdmin().auth.admin.createUser({
              email: user.email!,
              email_confirm: true, // Auto-confirm since OAuth provider verified email
              user_metadata: {
                full_name: user.name,
                avatar_url: user.image,
                provider: account?.provider,
              },
            });

            if (authError || !authUser.user) {
              console.error('Error creating auth user:', authError);
              throw new Error('Failed to create user in Supabase Auth');
            }

            authUserId = authUser.user.id;
            console.log(`Created new auth user ID ${authUserId} for ${user.email}`);
          }

          // Create record in users table
          const { error: usersError } = await (getSupabaseAdmin()
            .from('users') as any)
            .insert({
              id: authUserId,
              email: user.email,
            })
            .select()
            .single();

          if (usersError) {
            console.error('Error creating user record:', usersError);
            // Don't throw - the users table might not exist or have different schema
          }

          // Create new profile with auth user ID
          const { data: newProfile, error } = await (getSupabaseAdmin()
            .from('user_profiles') as any)
            .insert({
              id: authUserId,
              email: user.email,
              full_name: user.name,
              display_name: user.name || user.email?.split('@')[0],
              avatar_url: user.image,
              subscription_tier: 'FREE',
              monthly_usage: 0,
            })
            .select()
            .single();

          if (error) {
            console.error('Error creating profile:', error);
            throw new Error('Failed to create user profile');
          }
          userId = newProfile.id;
        } else {
          // For existing profiles, ensure we use the auth.users ID if it exists
          const { data: { users: existingAuthUsers } } = await getSupabaseAdmin().auth.admin.listUsers();
          const existingAuthUser = existingAuthUsers?.find(u => u.email === user.email);

          if (existingAuthUser && existingAuthUser.id !== existingProfile.id) {
            console.warn(`Profile ID mismatch for ${user.email}: profile=${existingProfile.id}, auth=${existingAuthUser.id}. Using auth ID.`);
            userId = existingAuthUser.id;
          } else {
            userId = existingProfile.id;
          }

          // Ensure users table record exists
          const { data: existingUser } = await (getSupabaseAdmin()
            .from('users') as any)
            .select('id')
            .eq('id', userId)
            .maybeSingle();

          if (!existingUser) {
            const { error: usersError } = await (getSupabaseAdmin()
              .from('users') as any)
              .insert({
                id: userId,
                email: user.email,
              });

            if (usersError) {
              console.error('Error creating users record for existing profile:', usersError);
            }
          }

          // Update existing profile with latest OAuth info
          await (getSupabaseAdmin()
            .from('user_profiles') as any)
            .update({
              full_name: user.name || existingProfile.full_name,
              display_name: user.name || existingProfile.display_name,
              avatar_url: user.image || existingProfile.avatar_url,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
        }

        token.id = userId;

        // Store subscription info and dates in token
        const { data: profile } = await (getSupabaseAdmin()
          .from('user_profiles') as any)
          .select('subscription_tier, monthly_usage, created_at, usage_reset_date, is_beta_tester, uses_own_key, credit_balance, preferred_mp_id, postal_code, show_my_mp_section')
          .eq('id', userId)
          .single();

        if (profile) {
          token.subscriptionTier = profile.subscription_tier;
          token.monthlyUsage = profile.monthly_usage;
          token.createdAt = profile.created_at;
          token.usageResetDate = profile.usage_reset_date;
          token.isBetaTester = profile.is_beta_tester;
          token.usesOwnKey = profile.uses_own_key;
          token.creditBalance = profile.credit_balance;
          token.preferredMpId = profile.preferred_mp_id;
          token.postalCode = profile.postal_code;
          token.showMyMpSection = profile.show_my_mp_section ?? true; // Default to true
        }

        // If this is an OAuth sign in, store the account
        if (account && account.provider !== 'credentials') {
          const { data: existingAccount } = await (getSupabaseAdmin()
            .from('accounts') as any)
            .select('id')
            .eq('provider', account.provider)
            .eq('provider_account_id', account.providerAccountId!)
            .maybeSingle();

          if (!existingAccount) {
            // Encrypt tokens before storing
            await (getSupabaseAdmin().from('accounts') as any).insert({
              user_id: userId,
              type: account.type,
              provider: account.provider,
              provider_account_id: account.providerAccountId,
              access_token: account.access_token ? encryptToken(account.access_token) : null,
              refresh_token: account.refresh_token ? encryptToken(account.refresh_token) : null,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token ? encryptToken(account.id_token) : null,
            });
          } else {
            // Update existing account tokens
            await (getSupabaseAdmin()
              .from('accounts') as any)
              .update({
                access_token: account.access_token ? encryptToken(account.access_token) : null,
                refresh_token: account.refresh_token ? encryptToken(account.refresh_token) : null,
                expires_at: account.expires_at,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingAccount.id);
          }
        }

        // Fetch linked providers
        const { data: accounts } = await (getSupabaseAdmin()
          .from('accounts') as any)
          .select('provider')
          .eq('user_id', userId);

        if (accounts) {
          token.linkedProviders = accounts.map((acc: any) => acc.provider);
        }
      } else if (token.id) {
        // Token refresh - update subscription data
        const { data: profile } = await (getSupabaseAdmin()
          .from('user_profiles') as any)
          .select('subscription_tier, monthly_usage, usage_reset_date, is_beta_tester, uses_own_key, credit_balance, preferred_mp_id, postal_code, show_my_mp_section')
          .eq('id', token.id as string)
          .single();

        if (profile) {
          token.subscriptionTier = profile.subscription_tier;
          token.monthlyUsage = profile.monthly_usage;
          token.usageResetDate = profile.usage_reset_date;
          token.isBetaTester = profile.is_beta_tester;
          token.usesOwnKey = profile.uses_own_key;
          token.creditBalance = profile.credit_balance;
          token.preferredMpId = profile.preferred_mp_id;
          token.postalCode = profile.postal_code;
          token.showMyMpSection = profile.show_my_mp_section ?? true; // Default to true
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.subscriptionTier = (token.subscriptionTier as string) || 'FREE';
        session.user.monthlyUsage = (token.monthlyUsage as number) || 0;
        session.user.createdAt = token.createdAt as string;
        session.user.usageResetDate = token.usageResetDate as string;
        session.user.linkedProviders = token.linkedProviders as string[];
        session.user.isBetaTester = (token.isBetaTester as boolean) || false;
        session.user.usesOwnKey = (token.usesOwnKey as boolean) || false;
        session.user.creditBalance = (token.creditBalance as number) || 0;
        session.user.preferredMpId = token.preferredMpId as string | null;
        session.user.postalCode = token.postalCode as string | null;
        session.user.showMyMpSection = token.showMyMpSection !== undefined ? (token.showMyMpSection as boolean) : true;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours - refresh token data daily
  },
  secret: process.env.NEXTAUTH_SECRET,
});
