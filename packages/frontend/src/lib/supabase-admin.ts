/**
 * Supabase Admin Client (Service Role)
 *
 * This client uses the service role key to bypass RLS policies.
 * Used exclusively in NextAuth callbacks and server-side operations.
 * NEVER expose this client to the frontend.
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Get Supabase admin client (singleton)
 * Uses service role key to bypass RLS
 */
let adminClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  // Lazy environment variable validation - only check when function is called
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }

  if (!adminClient) {
    adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}
