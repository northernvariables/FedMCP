/**
 * User Preferences API Route
 *
 * Handles CRUD operations for user preferences using NextAuth authentication
 * and Supabase admin client to bypass RLS policies
 */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/user/preferences
 * Fetch user preferences for the authenticated user
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();
    const userId = session.user.id;

    // Fetch preferences using admin client (bypasses RLS)
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is OK
      console.error('Error fetching preferences:', error);
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      );
    }

    // Return preferences or null if not found
    return NextResponse.json({ data: data || null });
  } catch (error) {
    console.error('Unexpected error in GET /api/user/preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/preferences
 * Create or update user preferences for the authenticated user
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();
    const userId = session.user.id;
    const body = await request.json();

    // Validate the body contains preference fields
    const validFields = [
      'threaded_view_enabled',
      'threaded_view_default_collapsed',
      'language',
      'theme',
      'density',
      'show_procedural_statements',
      'default_hansard_filter',
      'statements_per_page',
      'email_notifications',
      'push_notifications',
      'has_seen_welcome',
      'custom_gordie_prompt',
    ];

    const updates: any = {};
    for (const field of validFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid preference fields provided' },
        { status: 400 }
      );
    }

    // Upsert preferences using admin client (bypasses RLS)
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: userId,
          ...updates,
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error upserting preferences:', error);
      return NextResponse.json(
        { error: 'Failed to save preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in POST /api/user/preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
