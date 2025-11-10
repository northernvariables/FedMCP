/**
 * Conversations API Route
 *
 * Handles creating new conversations with proper NextAuth authentication
 */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    // Get user from NextAuth session
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, context_type, context_id, context_data, expires_at } = body;

    const supabase = getSupabaseAdmin();

    // First verify the user exists in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(session.user.id);

    if (authError || !authUser.user) {
      console.error('User not found in auth.users:', session.user.id, '- Session may be stale.');
      return NextResponse.json(
        { error: 'Session expired. Please sign out and sign in again to continue.' },
        { status: 401 }
      );
    }

    // Create conversation
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: session.user.id,
        title: title || 'New conversation',
        context_type,
        context_id,
        context_data,
        expires_at,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);

      // Check if it's a foreign key constraint error (user doesn't exist)
      if (error.code === '23503' && error.message?.includes('conversations_user_id_fkey')) {
        console.error('Foreign key violation - user not in auth.users:', session.user.id);
        return NextResponse.json(
          { error: 'Account setup incomplete. Please sign out and sign in again.' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: `Failed to create conversation: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error in POST /api/conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
