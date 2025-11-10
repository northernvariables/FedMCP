/**
 * API Key Management Routes
 *
 * Handles CRUD operations for user API keys (Anthropic, OpenAI, CanLII)
 * Keys are encrypted using AES-256-GCM before storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/auth';
import { encryptApiKey, maskApiKey } from '@/lib/encryption';

// Initialize Supabase with service role for admin operations
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

/**
 * GET /api/user/api-keys
 * Fetch user's API keys (masked for display)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseClient();

    // Fetch user's API keys
    const { data: keys, error } = await supabase
      .from('user_api_keys')
      .select('id, provider, is_active, last_validated_at, validation_error, created_at')
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error fetching API keys:', error);
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
    }

    // Return keys without the encrypted values
    return NextResponse.json({ keys: keys || [] });
  } catch (error) {
    console.error('GET /api/user/api-keys error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/user/api-keys
 * Save or update an API key
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { provider, apiKey } = body;

    // Validate provider
    if (!['anthropic', 'openai', 'canlii'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    // Validate API key presence
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // Encrypt the API key
    const { encrypted, iv, tag } = encryptApiKey(apiKey);

    const supabase = getSupabaseClient();

    // Upsert the API key (insert or update if exists)
    const { data, error } = await supabase
      .from('user_api_keys')
      .upsert({
        user_id: session.user.id,
        provider,
        encrypted_key: encrypted,
        encryption_iv: iv,
        encryption_tag: tag,
        is_active: true,
        last_validated_at: null, // Will be validated separately
        validation_error: null,
      }, {
        onConflict: 'user_id,provider'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving API key:', error);
      return NextResponse.json({ error: 'Failed to save API key' }, { status: 500 });
    }

    // Return success with masked key
    return NextResponse.json({
      success: true,
      key: {
        id: data.id,
        provider: data.provider,
        masked_key: maskApiKey(apiKey),
        is_active: data.is_active,
      }
    });
  } catch (error) {
    console.error('POST /api/user/api-keys error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/user/api-keys?provider=<provider>
 * Remove an API key
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    // Validate provider
    if (!provider || !['anthropic', 'openai', 'canlii'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Delete the API key
    const { error } = await supabase
      .from('user_api_keys')
      .delete()
      .eq('user_id', session.user.id)
      .eq('provider', provider);

    if (error) {
      console.error('Error deleting API key:', error);
      return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/user/api-keys error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
