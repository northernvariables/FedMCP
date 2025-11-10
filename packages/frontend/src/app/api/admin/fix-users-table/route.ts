/**
 * Admin endpoint to ensure all auth users have records in the users table
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();

  try {
    // Get all users from auth.users
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();

    if (!authUsers) {
      return NextResponse.json(
        { error: 'No users found in auth.users' },
        { status: 404 }
      );
    }

    const fixed: string[] = [];
    const skipped: string[] = [];
    const errors: Array<{ email: string; error: string }> = [];

    for (const authUser of authUsers) {
      // Check if user exists in users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', authUser.id)
        .maybeSingle();

      if (existingUser) {
        skipped.push(authUser.email || 'unknown');
        continue;
      }

      // Create user record
      const { error: insertError } = await (supabase
        .from('users') as any)
        .insert({
          id: authUser.id,
          email: authUser.email,
        });

      if (insertError) {
        console.error(`Error creating user record for ${authUser.email}:`, insertError);
        errors.push({ email: authUser.email || 'unknown', error: insertError.message });
      } else {
        console.log(`Created user record for ${authUser.email}`);
        fixed.push(authUser.email || 'unknown');
      }
    }

    return NextResponse.json({
      success: true,
      total: authUsers.length,
      fixed: fixed.length,
      skipped: skipped.length,
      errors: errors.length,
      details: {
        fixed,
        skipped,
        errors,
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
