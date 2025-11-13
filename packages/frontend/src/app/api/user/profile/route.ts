/**
 * User Profile API
 * Update user profile fields (stored in user_profiles table)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function PATCH(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { show_my_mp_section, preferred_mp_id, postal_code } = body;

    // Validate input
    const updates: any = {};

    if (show_my_mp_section !== undefined) {
      updates.show_my_mp_section = Boolean(show_my_mp_section);
    }

    if (preferred_mp_id !== undefined) {
      updates.preferred_mp_id = preferred_mp_id;
    }

    if (postal_code !== undefined) {
      updates.postal_code = postal_code;
    }

    // If no valid updates, return error
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update user profile
    const { data, error } = await (getSupabaseAdmin()
      .from('user_profiles') as any)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: data,
    });
  } catch (error) {
    console.error('Error in profile API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
