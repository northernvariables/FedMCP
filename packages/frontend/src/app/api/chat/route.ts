/**
 * Main Chat API Route - Streaming AI Responses
 *
 * Handles:
 * - Quota validation
 * - BYOK key detection
 * - Context-aware prompt injection
 * - Streaming responses via SSE
 * - Token tracking and cost calculation
 * - Automatic usage logging
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import crypto from 'crypto';
import type { ContextType } from '@/lib/types/chat';

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

// AI Provider clients (server-side) - lazy initialization to avoid build-time errors
function getAnthropicClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Pricing constants (per 1M tokens)
const CLAUDE_SONNET_INPUT_PRICE = 3.00; // $3 per 1M input tokens
const CLAUDE_SONNET_OUTPUT_PRICE = 15.00; // $15 per 1M output tokens

const GPT4_TURBO_INPUT_PRICE = 10.00; // $10 per 1M input tokens
const GPT4_TURBO_OUTPUT_PRICE = 30.00; // $30 per 1M output tokens

// Encryption for BYOK keys
function decryptKey(encryptedKey: string, iv: string, tag: string): string {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'),
    Buffer.from(iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(tag, 'hex'));

  let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// Generate context-aware system prompt
function generateSystemPrompt(context?: {
  type: ContextType;
  id?: string;
  data?: Record<string, any>;
}): string {
  const basePrompt = `You are CanadaGPT, an AI assistant specializing in Canadian federal parliamentary data. You have access to information about:

- Members of Parliament (MPs), their voting records, expenses, and activities
- Bills and legislation (status, sponsors, voting records)
- House of Commons debates and Hansard transcripts
- Committee activities and memberships
- Lobbying registrations and communications
- Petitions and citizen engagement
- Government spending and contracts

Provide accurate, concise, and well-sourced information. When citing specific data, reference the source (e.g., "According to House of Commons records..." or "Based on lobbying registry data...").`;

  if (!context) {
    return basePrompt;
  }

  // Add context-specific instructions
  const contextPrompts: Record<ContextType, string> = {
    general: '',
    mp: `\n\nYou are currently viewing the profile page for MP: ${context.data?.name || 'Unknown'} (${context.data?.party || 'Unknown Party'}, ${context.data?.riding || 'Unknown Riding'}).

When answering questions, prioritize information about this specific MP. You can reference their:
- Recent bills sponsored: ${context.data?.recent_bills?.length || 0} bills
- Total expenses: $${context.data?.expenses?.toLocaleString() || 'N/A'}
- Committee memberships
- Voting record
- Petition sponsorships`,

    bill: `\n\nYou are currently viewing Bill ${context.data?.number || 'Unknown'}: "${context.data?.title || 'Unknown Title'}"

Current Status: ${context.data?.status || 'Unknown'}
Sponsor: ${context.data?.sponsor || 'Unknown'}

When answering questions, prioritize information about this specific bill, including:
- Legislative progress and timeline
- Voting records
- Committee reviews
- Lobbying activity related to this bill
- Public petitions related to this bill`,

    dashboard: `\n\nYou are on the Dashboard overview page showing aggregated parliamentary data.

Current data includes:
- Top spending MPs
- Active bills in current session
- Recent committee activities
- Conflict of interest alerts

When answering questions, provide high-level insights and cross-referenced analysis across multiple data sources.`,

    lobbying: `\n\nYou are viewing lobbying data for Canadian federal government.

When answering questions, focus on:
- Who is lobbying whom
- Which organizations are most active
- Corporate influence on specific legislation
- Meetings between lobbyists and government officials (DPOHs)`,

    spending: `\n\nYou are viewing government spending and financial data.

When answering questions, focus on:
- MP quarterly expenditures
- Government contracts
- Departmental spending
- Unusual spending patterns or outliers`,
  };

  return basePrompt + (contextPrompts[context.type] || '');
}

// Calculate cost in USD based on tokens
function calculateCost(
  provider: 'anthropic' | 'openai',
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  if (provider === 'anthropic') {
    // Claude Sonnet 3.5
    return (
      (inputTokens / 1_000_000) * CLAUDE_SONNET_INPUT_PRICE +
      (outputTokens / 1_000_000) * CLAUDE_SONNET_OUTPUT_PRICE
    );
  } else {
    // GPT-4 Turbo
    return (
      (inputTokens / 1_000_000) * GPT4_TURBO_INPUT_PRICE +
      (outputTokens / 1_000_000) * GPT4_TURBO_OUTPUT_PRICE
    );
  }
}

export async function POST(request: Request) {
  const supabase = getSupabaseClient();
  try {
    const body = await request.json();
    const { conversation_id, message, context } = body;

    if (!conversation_id || !message) {
      return Response.json(
        { error: 'Missing conversation_id or message' },
        { status: 400 }
      );
    }

    // Get user from Supabase auth
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return Response.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return Response.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Check quota using PostgreSQL function
    const { data: quotaResult, error: quotaError } = await supabase.rpc(
      'can_user_query',
      { p_user_id: user.id }
    );

    if (quotaError) {
      console.error('Quota check error:', quotaError);
      return Response.json(
        { error: 'Failed to check quota' },
        { status: 500 }
      );
    }

    if (!quotaResult[0]?.can_query) {
      return Response.json(
        {
          error: quotaResult[0]?.reason || 'Quota exceeded',
          requires_payment: quotaResult[0]?.requires_payment || false,
        },
        { status: 429 }
      );
    }

    // Check for BYOK keys
    const { data: apiKeys } = await supabase
      .from('user_api_keys')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    const anthropicKey = apiKeys?.find((k) => k.provider === 'anthropic');
    const openaiKey = apiKeys?.find((k) => k.provider === 'openai');

    // Determine which provider to use
    let provider: 'anthropic' | 'openai' = 'anthropic';
    let usedBYOKey = false;
    let providerClient: Anthropic | OpenAI;

    if (anthropicKey) {
      // Use user's Anthropic key
      const decryptedKey = decryptKey(
        anthropicKey.encrypted_key,
        anthropicKey.encryption_iv,
        anthropicKey.encryption_tag
      );
      providerClient = new Anthropic({ apiKey: decryptedKey });
      provider = 'anthropic';
      usedBYOKey = true;
    } else if (openaiKey) {
      // Use user's OpenAI key
      const decryptedKey = decryptKey(
        openaiKey.encrypted_key,
        openaiKey.encryption_iv,
        openaiKey.encryption_tag
      );
      providerClient = new OpenAI({ apiKey: decryptedKey });
      provider = 'openai';
      usedBYOKey = true;
    } else {
      // Use platform's Anthropic key
      providerClient = getAnthropicClient();
      provider = 'anthropic';
    }

    // Load conversation history
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true })
      .limit(20); // Keep last 20 messages for context

    // Build message history
    const systemPrompt = generateSystemPrompt(context);

    // Save user message to database
    const { data: userMessage, error: userMsgError } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        role: 'user',
        content: message,
        used_byo_key: usedBYOKey,
      })
      .select()
      .single();

    if (userMsgError) {
      console.error('Error saving user message:', userMsgError);
      return Response.json(
        { error: 'Failed to save message' },
        { status: 500 }
      );
    }

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let assistantContent = '';
          let inputTokens = 0;
          let outputTokens = 0;

          if (provider === 'anthropic') {
            // Anthropic Claude streaming
            const messageHistory = messages?.map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })) || [];

            messageHistory.push({
              role: 'user',
              content: message,
            });

            const stream = await (providerClient as Anthropic).messages.stream({
              model: 'claude-sonnet-3-5-20241022',
              max_tokens: 4096,
              system: systemPrompt,
              messages: messageHistory,
            });

            for await (const chunk of stream) {
              if (chunk.type === 'content_block_delta') {
                const text = chunk.delta.type === 'text_delta' ? chunk.delta.text : '';
                assistantContent += text;

                // Send chunk to client
                const data = `data: ${JSON.stringify({ content: text })}\n\n`;
                controller.enqueue(encoder.encode(data));
              }

              if (chunk.type === 'message_start') {
                inputTokens = chunk.message.usage.input_tokens;
              }

              if (chunk.type === 'message_delta') {
                outputTokens = chunk.usage.output_tokens;
              }
            }
          } else {
            // OpenAI GPT streaming
            const messageHistory = [
              { role: 'system' as const, content: systemPrompt },
              ...(messages?.map((m) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
              })) || []),
              { role: 'user' as const, content: message },
            ];

            const stream = await (providerClient as OpenAI).chat.completions.create({
              model: 'gpt-4-turbo-preview',
              messages: messageHistory,
              stream: true,
            });

            for await (const chunk of stream) {
              const text = chunk.choices[0]?.delta?.content || '';
              assistantContent += text;

              // Send chunk to client
              const data = `data: ${JSON.stringify({ content: text })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }

            // Estimate tokens for OpenAI (rough estimate: 1 token ≈ 4 characters)
            inputTokens = Math.ceil(
              (systemPrompt.length + messageHistory.map((m) => m.content).join('').length) / 4
            );
            outputTokens = Math.ceil(assistantContent.length / 4);
          }

          // Calculate cost
          const totalTokens = inputTokens + outputTokens;
          const cost = calculateCost(provider, 'claude-sonnet-3-5-20241022', inputTokens, outputTokens);

          // Save assistant message to database
          const { data: assistantMessage, error: assistantMsgError } = await supabase
            .from('messages')
            .insert({
              conversation_id,
              role: 'assistant',
              content: assistantContent,
              tokens_input: inputTokens,
              tokens_output: outputTokens,
              tokens_total: totalTokens,
              provider,
              model: provider === 'anthropic' ? 'claude-sonnet-3-5-20241022' : 'gpt-4-turbo-preview',
              used_byo_key: usedBYOKey,
              cost_usd: cost,
            })
            .select()
            .single();

          if (assistantMsgError) {
            console.error('Error saving assistant message:', assistantMsgError);
          }

          // Track usage in database (only if not using BYOK)
          if (!usedBYOKey) {
            const today = new Date().toISOString().split('T')[0];

            const { error: usageError } = await supabase.rpc('track_query_usage', {
              p_user_id: user.id,
              p_conversation_id: conversation_id,
              p_message_id: assistantMessage?.id,
              p_query_date: today,
              p_tokens_input: inputTokens,
              p_tokens_output: outputTokens,
              p_cost_usd: cost,
              p_provider: provider,
              p_model: provider === 'anthropic' ? 'claude-sonnet-3-5-20241022' : 'gpt-4-turbo-preview',
              p_used_byo_key: false,
            });

            if (usageError) {
              console.error('Error tracking usage:', usageError);
            }
          }

          // Update conversation metadata
          await supabase
            .from('conversations')
            .update({
              message_count: (messages?.length || 0) + 2, // +2 for user and assistant messages
              total_tokens: totalTokens,
              last_message_at: new Date().toISOString(),
            })
            .eq('id', conversation_id);

          // Send completion signal
          const doneData = `data: ${JSON.stringify({
            done: true,
            message: assistantMessage,
          })}\n\n`;
          controller.enqueue(encoder.encode(doneData));

          // End stream
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          const errorData = `data: ${JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
          })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
