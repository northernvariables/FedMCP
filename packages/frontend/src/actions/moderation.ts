'use server';

/**
 * Moderation Server Actions
 * Admin actions for content moderation and report management
 */

import { createServerClient, createAdminClient } from '@/lib/supabase-server';
import { auth } from '@/auth';
import type {
  ModerationReport,
  ModerationAction,
  CreateReportInput,
  ResolveReportInput,
  ModeratePostInput,
  ApiResponse,
  PaginatedResponse,
} from '@/types/forum';

// ============================================
// USER REPORTING
// ============================================

export async function reportPost(
  input: CreateReportInput
): Promise<ApiResponse> {
  try {
    const supabase = await createServerClient();
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error('You must be logged in to report content');
    }

    const userId = session.user.id;

    // Check if post exists
    const { data: post } = await supabase
      .from('forum_posts')
      .select('id')
      .eq('id', input.post_id)
      .single();

    if (!post) {
      throw new Error('Post not found');
    }

    // Check for duplicate report
    const { data: existingReport } = await supabase
      .from('moderation_reports')
      .select('id')
      .eq('post_id', input.post_id)
      .eq('reporter_id', userId)
      .maybeSingle();

    if (existingReport) {
      throw new Error('You have already reported this post');
    }

    // Create report
    const { error } = await supabase.from('moderation_reports').insert({
      post_id: input.post_id,
      reporter_id: userId,
      reason: input.reason,
      status: 'pending',
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error reporting post:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to report post',
    };
  }
}

// ============================================
// ADMIN: REPORT MANAGEMENT
// ============================================

/**
 * Check if current user is an admin
 * Queries the user_profiles table for is_admin flag
 */
async function isAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }

    return data?.is_admin || false;
  } catch (error) {
    console.error('Error in isAdmin:', error);
    return false;
  }
}

export async function getPendingReports(
  limit: number = 50,
  offset: number = 0
): Promise<ApiResponse<PaginatedResponse<ModerationReport>>> {
  try {
    const supabase = await createServerClient();
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const userId = session.user.id;

    const admin = await isAdmin(userId);
    if (!admin) {
      throw new Error('Admin access required');
    }

    const { data, error, count } = await supabase
      .from('moderation_reports')
      .select(
        `
        *,
        post:forum_posts(*),
        reporter:user_profiles(display_name, avatar_url)
      `,
        { count: 'exact' }
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      success: true,
      data: {
        data: data || [],
        total: count || 0,
        limit,
        offset,
        has_more: count ? offset + limit < count : false,
      },
    };
  } catch (error) {
    console.error('Error fetching reports:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch reports',
    };
  }
}

export async function resolveReport(
  input: ResolveReportInput
): Promise<ApiResponse> {
  try {
    const supabase = await createServerClient();
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const userId = session.user.id;

    const admin = await isAdmin(userId);
    if (!admin) {
      throw new Error('Admin access required');
    }

    const { error } = await supabase
      .from('moderation_reports')
      .update({
        status: input.status,
        resolved_by: userId,
        resolved_at: new Date().toISOString(),
        admin_notes: input.admin_notes || null,
      })
      .eq('id', input.report_id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error resolving report:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resolve report',
    };
  }
}

// ============================================
// ADMIN: POST MODERATION
// ============================================

export async function moderatePost(
  input: ModeratePostInput
): Promise<ApiResponse> {
  try {
    const supabase = await createServerClient();
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const userId = session.user.id;

    const admin = await isAdmin(userId);
    if (!admin) {
      throw new Error('Admin access required');
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient();

    // Check if post exists
    const { data: post } = await adminClient
      .from('forum_posts')
      .select('id, is_deleted, is_locked, is_pinned')
      .eq('id', input.post_id)
      .single();

    if (!post) {
      throw new Error('Post not found');
    }

    // Apply moderation action
    let updateData: any = {};

    switch (input.action) {
      case 'delete':
        updateData = {
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: userId,
        };
        break;

      case 'lock':
        if (post.is_locked) {
          throw new Error('Post is already locked');
        }
        updateData = { is_locked: true };
        break;

      case 'unlock':
        if (!post.is_locked) {
          throw new Error('Post is not locked');
        }
        updateData = { is_locked: false };
        break;

      case 'pin':
        if (post.is_pinned) {
          throw new Error('Post is already pinned');
        }
        updateData = { is_pinned: true };
        break;

      case 'unpin':
        if (!post.is_pinned) {
          throw new Error('Post is not pinned');
        }
        updateData = { is_pinned: false };
        break;

      case 'warn':
        // For warnings, we just log the action without modifying the post
        break;

      default:
        throw new Error('Invalid moderation action');
    }

    // Update post if needed
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await adminClient
        .from('forum_posts')
        .update(updateData)
        .eq('id', input.post_id);

      if (updateError) throw updateError;
    }

    // Log moderation action
    const { error: logError } = await adminClient
      .from('moderation_actions')
      .insert({
        post_id: input.post_id,
        moderator_id: userId,
        action: input.action,
        reason: input.reason || null,
      });

    if (logError) throw logError;

    return { success: true };
  } catch (error) {
    console.error('Error moderating post:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to moderate post',
    };
  }
}

export async function getModerationActions(
  postId: string
): Promise<ApiResponse<ModerationAction[]>> {
  try {
    const supabase = await createServerClient();
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const userId = session.user.id;

    const admin = await isAdmin(userId);
    if (!admin) {
      throw new Error('Admin access required');
    }

    const { data, error } = await supabase
      .from('moderation_actions')
      .select(
        `
        *,
        moderator:user_profiles(display_name, avatar_url)
      `
      )
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching moderation actions:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch moderation actions',
    };
  }
}

// ============================================
// ADMIN: BULK OPERATIONS
// ============================================

export async function bulkModerate(
  postIds: string[],
  action: 'delete' | 'lock' | 'unlock'
): Promise<ApiResponse<{ successful: string[]; failed: string[] }>> {
  try {
    const supabase = await createServerClient();
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const userId = session.user.id;

    const admin = await isAdmin(userId);
    if (!admin) {
      throw new Error('Admin access required');
    }

    const results = {
      successful: [] as string[],
      failed: [] as string[],
    };

    // Process each post
    for (const postId of postIds) {
      const result = await moderatePost({ post_id: postId, action });
      if (result.success) {
        results.successful.push(postId);
      } else {
        results.failed.push(postId);
      }
    }

    return { success: true, data: results };
  } catch (error) {
    console.error('Error bulk moderating:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to bulk moderate',
    };
  }
}

// ============================================
// ADMIN: STATISTICS
// ============================================

export async function getModerationStats(): Promise<
  ApiResponse<{
    pending_reports: number;
    resolved_today: number;
    total_actions: number;
    deleted_posts: number;
  }>
> {
  try {
    const supabase = await createServerClient();
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const userId = session.user.id;

    const admin = await isAdmin(userId);
    if (!admin) {
      throw new Error('Admin access required');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get counts
    const [
      { count: pending_reports },
      { count: resolved_today },
      { count: total_actions },
      { count: deleted_posts },
    ] = await Promise.all([
      supabase
        .from('moderation_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('moderation_reports')
        .select('*', { count: 'exact', head: true })
        .gte('resolved_at', today.toISOString())
        .in('status', ['resolved', 'dismissed']),
      supabase
        .from('moderation_actions')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('forum_posts')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', true),
    ]);

    return {
      success: true,
      data: {
        pending_reports: pending_reports || 0,
        resolved_today: resolved_today || 0,
        total_actions: total_actions || 0,
        deleted_posts: deleted_posts || 0,
      },
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch statistics',
    };
  }
}
