/**
 * Admin endpoint to fix OAuth users created before auth.users integration
 *
 * This creates missing auth.users records for existing user_profiles
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();

  try {
    // Get all user_profiles that don't have corresponding auth.users records
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, avatar_url');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json(
        { error: 'Failed to fetch user profiles' },
        { status: 500 }
      );
    }

    const fixed: string[] = [];
    const skipped: string[] = [];
    const errors: Array<{ email: string; error: string }> = [];

    for (const profile of profiles || []) {
      // Check if auth user exists with this profile ID
      const { data: authUserById } = await supabase.auth.admin.getUserById(profile.id);

      if (authUserById.user) {
        // Profile ID matches auth user ID - all good
        skipped.push(profile.email);
        continue;
      }

      // Check if auth user exists with this email (different ID)
      const { data: { users: authUsersByEmail }, error: listError } = await supabase.auth.admin.listUsers();

      if (listError) {
        errors.push({ email: profile.email, error: listError.message });
        continue;
      }

      const existingAuthUser = authUsersByEmail?.find(u => u.email === profile.email);

      if (existingAuthUser) {
        // Auth user exists with different ID - update user_profiles to use auth user ID
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ id: existingAuthUser.id })
          .eq('id', profile.id);

        if (updateError) {
          console.error(`Error updating profile ID for ${profile.email}:`, updateError);
          errors.push({ email: profile.email, error: updateError.message });
        } else {
          console.log(`Updated profile ID for ${profile.email} from ${profile.id} to ${existingAuthUser.id}`);
          fixed.push(profile.email);
        }
      } else {
        // No auth user exists - create one
        const { data: newAuthUser, error: authError } = await supabase.auth.admin.createUser({
          id: profile.id, // Use the same ID from user_profiles
          email: profile.email,
          email_confirm: true,
          user_metadata: {
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            provider: 'oauth',
          },
        });

        if (authError) {
          console.error(`Error creating auth user for ${profile.email}:`, authError);
          errors.push({ email: profile.email, error: authError.message });
        } else {
          console.log(`Created auth user for ${profile.email}`);
          fixed.push(profile.email);
        }
      }
    }

    return NextResponse.json({
      success: true,
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
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
