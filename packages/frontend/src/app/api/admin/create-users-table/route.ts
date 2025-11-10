/**
 * Admin endpoint to create the users table if it doesn't exist
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();

  try {
    // Create users table with minimal schema
    // This is a simple mapping table that links to auth.users
    const { error } = await (supabase.rpc as any)('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.users (
          id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          email TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create index on email for faster lookups
        CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);

        -- Enable RLS
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

        -- RLS Policy: Users can read their own record
        CREATE POLICY IF NOT EXISTS "Users can read own record"
          ON public.users
          FOR SELECT
          USING (auth.uid() = id);

        -- RLS Policy: Service role can do everything
        CREATE POLICY IF NOT EXISTS "Service role has full access"
          ON public.users
          FOR ALL
          USING (true);
      `
    });

    if (error) {
      // If exec_sql function doesn't exist, try direct SQL
      console.error('RPC exec_sql error:', error);
      return NextResponse.json(
        {
          error: 'Cannot execute SQL directly. Please run this SQL in Supabase SQL editor',
          sql: `
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can read own record"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);
`
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Users table created successfully',
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
