'use server';

/**
 * Forum Server Actions
 * Next.js Server Actions for forum CRUD operations
 */

import { createServerClient, createAdminClient } from '@/lib/supabase-server';
import { auth } from '@/auth';
import type {
  ForumPost,
  ForumCategory,
  CreatePostInput,
  UpdatePostInput,
  GetPostsParams,
  ApiResponse,
  PaginatedResponse,
  VoteType,
} from '@/types/forum';

// ============================================
// CATEGORIES
// ============================================

export async function getCategories(): Promise<ApiResponse<ForumCategory[]>> {
  try {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('forum_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching categories:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch categories',
    };
  }
}

export async function getCategoryBySlug(
  slug: string
): Promise<ApiResponse<ForumCategory>> {
  try {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('forum_categories')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Category not found');

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching category:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Category not found',
    };
  }
}

// ============================================
// POSTS - READ
// ============================================

export async function getPosts(
  params: GetPostsParams = {}
): Promise<ApiResponse<PaginatedResponse<ForumPost>>> {
  try {
    const supabase = await createServerClient();
    const {
      category_id,
      bill_number,
      bill_session,
      author_id,
      limit = 20,
      offset = 0,
      sort = 'recent',
    } = params;

    let query = supabase
      .from('forum_posts')
      .select('*, author:user_profiles(display_name, avatar_url)', { count: 'exact' })
      .eq('is_deleted', false)
      .eq('depth', 0); // Only top-level posts

    // Filters
    if (category_id) {
      query = query.eq('category_id', category_id);
    }
    if (bill_number && bill_session) {
      query = query.eq('bill_number', bill_number).eq('bill_session', bill_session);
    }
    if (author_id) {
      query = query.eq('author_id', author_id);
    }

    // Sorting
    switch (sort) {
      case 'hot':
        query = query.order('last_reply_at', { ascending: false });
        break;
      case 'top':
        query = query.order('upvotes_count', { ascending: false });
        break;
      case 'recent':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

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
    console.error('Error fetching posts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch posts',
    };
  }
}

export async function getPost(postId: string): Promise<ApiResponse<ForumPost>> {
  try {
    const supabase = await createServerClient();
    const session = await auth();

    const { data, error } = await supabase
      .from('forum_posts')
      .select('*, author:user_profiles(display_name, avatar_url), category:forum_categories(*)')
      .eq('id', postId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Post not found');

    // Get user's vote if authenticated
    if (session?.user?.id) {
      const { data: voteData } = await supabase
        .from('forum_votes')
        .select('vote_type')
        .eq('post_id', postId)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (voteData) {
        data.user_vote = voteData.vote_type;
      }
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching post:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Post not found',
    };
  }
}

export async function getPostThread(
  postId: string,
  maxDepth: number = 10
): Promise<ApiResponse<ForumPost[]>> {
  try {
    const supabase = await createServerClient();
    const session = await auth();

    // Get the root post
    const rootPost = await getPost(postId);
    if (!rootPost.success || !rootPost.data) {
      throw new Error('Post not found');
    }

    // Get all replies in the thread
    const threadRootId = rootPost.data.thread_root_id || postId;

    const { data, error } = await supabase
      .from('forum_posts')
      .select('*, author:user_profiles(display_name, avatar_url)')
      .eq('thread_root_id', threadRootId)
      .lte('depth', maxDepth)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Get user votes if authenticated
    if (session?.user?.id && data) {
      const postIds = data.map((p) => p.id);
      const { data: votes } = await supabase
        .from('forum_votes')
        .select('post_id, vote_type')
        .eq('user_id', session.user.id)
        .in('post_id', postIds);

      if (votes) {
        const voteMap = new Map(votes.map((v) => [v.post_id, v.vote_type]));
        data.forEach((post) => {
          post.user_vote = voteMap.get(post.id) || null;
        });
      }
    }

    // Build threaded structure
    const postsWithReplies = buildThreadTree(data || []);

    return { success: true, data: postsWithReplies };
  } catch (error) {
    console.error('Error fetching thread:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch thread',
    };
  }
}

// Helper function to build thread tree
function buildThreadTree(posts: ForumPost[]): ForumPost[] {
  const postMap = new Map<string, ForumPost>();
  const rootPosts: ForumPost[] = [];

  // Initialize all posts with empty replies array
  posts.forEach((post) => {
    postMap.set(post.id, { ...post, replies: [] });
  });

  // Build tree structure
  posts.forEach((post) => {
    const postWithReplies = postMap.get(post.id)!;

    if (post.parent_post_id) {
      const parent = postMap.get(post.parent_post_id);
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(postWithReplies);
      }
    } else {
      rootPosts.push(postWithReplies);
    }
  });

  return rootPosts;
}

// ============================================
// POSTS - CREATE
// ============================================

export async function createPost(
  input: CreatePostInput
): Promise<ApiResponse<ForumPost>> {
  try {
    const supabase = await createServerClient();
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error('You must be logged in to create a post');
    }

    const userId = session.user.id;

    // Get user profile for denormalized data
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('display_name, avatar_url')
      .eq('id', userId)
      .maybeSingle();

    // Calculate depth and thread_root_id for replies
    let depth = 0;
    let thread_root_id: string | null = null;

    if (input.parent_post_id) {
      const { data: parentPost } = await supabase
        .from('forum_posts')
        .select('depth, thread_root_id, id, is_locked')
        .eq('id', input.parent_post_id)
        .single();

      if (!parentPost) {
        throw new Error('Parent post not found');
      }

      if (parentPost.is_locked) {
        throw new Error('This post is locked and cannot receive replies');
      }

      depth = parentPost.depth + 1;
      thread_root_id = parentPost.thread_root_id || parentPost.id;

      if (depth > 10) {
        throw new Error('Maximum reply depth exceeded');
      }
    }

    // Validate required fields
    if (depth === 0 && !input.title) {
      throw new Error('Title is required for top-level posts');
    }

    if (input.post_type === 'discussion' && !input.category_id) {
      throw new Error('Category is required for discussion posts');
    }

    if (
      input.post_type === 'bill_comment' &&
      (!input.bill_number || !input.bill_session)
    ) {
      throw new Error('Bill number and session are required for bill comments');
    }

    // Check rate limit
    const { data: canPost } = await supabase.rpc('check_post_rate_limit', {
      p_user_id: userId,
    });

    if (canPost === false) {
      throw new Error(
        'Rate limit exceeded. You can only create 10 posts per hour. Please try again later.'
      );
    }

    // Create post
    const postData: any = {
      post_type: input.post_type,
      content: input.content,
      author_id: userId,
      author_name: profile?.display_name || session.user.email?.split('@')[0] || 'Anonymous',
      author_avatar_url: profile?.avatar_url,
      depth,
      thread_root_id,
      parent_post_id: input.parent_post_id || null,
    };

    if (input.title) postData.title = input.title;
    if (input.category_id) postData.category_id = input.category_id;
    if (input.bill_number) postData.bill_number = input.bill_number;
    if (input.bill_session) postData.bill_session = input.bill_session;

    const { data, error } = await supabase
      .from('forum_posts')
      .insert(postData)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error creating post:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create post',
    };
  }
}

// ============================================
// POSTS - UPDATE
// ============================================

export async function updatePost(
  postId: string,
  input: UpdatePostInput
): Promise<ApiResponse<ForumPost>> {
  try {
    const supabase = await createServerClient();
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error('You must be logged in to update a post');
    }

    const userId = session.user.id;

    // Check ownership
    const { data: post } = await supabase
      .from('forum_posts')
      .select('author_id, is_locked')
      .eq('id', postId)
      .single();

    if (!post) {
      throw new Error('Post not found');
    }

    if (post.author_id !== userId) {
      throw new Error('You can only edit your own posts');
    }

    if (post.is_locked) {
      throw new Error('This post is locked and cannot be edited');
    }

    // Update post
    const { data, error } = await supabase
      .from('forum_posts')
      .update(input)
      .eq('id', postId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating post:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update post',
    };
  }
}

// ============================================
// POSTS - DELETE (Soft Delete)
// ============================================

export async function deletePost(postId: string): Promise<ApiResponse> {
  try {
    const supabase = await createServerClient();
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error('You must be logged in to delete a post');
    }

    const userId = session.user.id;

    // Check ownership
    const { data: post } = await supabase
      .from('forum_posts')
      .select('author_id')
      .eq('id', postId)
      .single();

    if (!post) {
      throw new Error('Post not found');
    }

    if (post.author_id !== userId) {
      throw new Error('You can only delete your own posts');
    }

    // Soft delete
    const { error } = await supabase
      .from('forum_posts')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      })
      .eq('id', postId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting post:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete post',
    };
  }
}

// ============================================
// VOTING
// ============================================

export async function votePost(
  postId: string,
  voteType: VoteType
): Promise<ApiResponse<{ upvotes: number; downvotes: number }>> {
  try {
    const supabase = await createServerClient();
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error('You must be logged in to vote');
    }

    const userId = session.user.id;

    // Check if post exists
    const { data: post } = await supabase
      .from('forum_posts')
      .select('id')
      .eq('id', postId)
      .single();

    if (!post) {
      throw new Error('Post not found');
    }

    // Check existing vote
    const { data: existingVote } = await supabase
      .from('forum_votes')
      .select('vote_type')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        // Remove vote (toggle off)
        await supabase
          .from('forum_votes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId);
      } else {
        // Change vote
        await supabase
          .from('forum_votes')
          .update({ vote_type: voteType })
          .eq('post_id', postId)
          .eq('user_id', userId);
      }
    } else {
      // Create new vote
      await supabase.from('forum_votes').insert({
        post_id: postId,
        user_id: userId,
        vote_type: voteType,
      });
    }

    // Get updated vote counts
    const { data: updatedPost } = await supabase
      .from('forum_posts')
      .select('upvotes_count, downvotes_count')
      .eq('id', postId)
      .single();

    return {
      success: true,
      data: {
        upvotes: updatedPost?.upvotes_count || 0,
        downvotes: updatedPost?.downvotes_count || 0,
      },
    };
  } catch (error) {
    console.error('Error voting:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to vote',
    };
  }
}

// ============================================
// USER PROFILE
// ============================================

export async function getUserProfile(
  userId: string
): Promise<ApiResponse<any>> {
  try {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching profile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch profile',
    };
  }
}

export async function ensureUserProfile(): Promise<ApiResponse> {
  try {
    const supabase = await createServerClient();
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error('Not authenticated');
    }

    const userId = session.user.id;

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingProfile) {
      // Create profile
      const { error } = await supabase.from('user_profiles').insert({
        id: userId,
        display_name: session.user.email?.split('@')[0] || 'User',
      });

      if (error) throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error ensuring profile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create profile',
    };
  }
}
