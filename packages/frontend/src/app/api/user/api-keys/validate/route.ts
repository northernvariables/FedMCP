/**
 * API Key Validation Route
 *
 * Tests API keys to ensure they work before saving
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with service role
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
 * Validate an Anthropic API key
 */
async function validateAnthropicKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const client = new Anthropic({ apiKey });

    // Make a minimal test request
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }],
    });

    return { valid: true };
  } catch (error: any) {
    console.error('Anthropic validation error:', error);
    return {
      valid: false,
      error: error.message || 'Invalid Anthropic API key'
    };
  }
}

/**
 * Validate an OpenAI API key
 */
async function validateOpenAIKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const client = new OpenAI({ apiKey });

    // Make a minimal test request
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 10,
    });

    return { valid: true };
  } catch (error: any) {
    console.error('OpenAI validation error:', error);
    return {
      valid: false,
      error: error.message || 'Invalid OpenAI API key'
    };
  }
}

/**
 * Validate a CanLII API key
 */
async function validateCanLIIKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    // Test the CanLII API with a simple request
    const response = await fetch('https://api.canlii.org/v1/caseBrowse/en/', {
      headers: {
        'API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      return {
        valid: false,
        error: `CanLII API returned status ${response.status}`
      };
    }

    return { valid: true };
  } catch (error: any) {
    console.error('CanLII validation error:', error);
    return {
      valid: false,
      error: error.message || 'Invalid CanLII API key'
    };
  }
}

/**
 * POST /api/user/api-keys/validate
 * Validate an API key before saving
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

    // Validate the key with the provider
    let result: { valid: boolean; error?: string };

    switch (provider) {
      case 'anthropic':
        result = await validateAnthropicKey(apiKey);
        break;
      case 'openai':
        result = await validateOpenAIKey(apiKey);
        break;
      case 'canlii':
        result = await validateCanLIIKey(apiKey);
        break;
      default:
        return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
    }

    if (!result.valid) {
      return NextResponse.json({
        valid: false,
        error: result.error || 'API key validation failed'
      }, { status: 400 });
    }

    // If there's an existing key for this provider, update its validation status
    const supabase = getSupabaseClient();
    const { data: existingKey } = await supabase
      .from('user_api_keys')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('provider', provider)
      .single();

    if (existingKey) {
      await supabase
        .from('user_api_keys')
        .update({
          last_validated_at: new Date().toISOString(),
          validation_error: null,
        })
        .eq('id', existingKey.id);
    }

    return NextResponse.json({
      valid: true,
      message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} API key is valid`
    });
  } catch (error) {
    console.error('POST /api/user/api-keys/validate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
