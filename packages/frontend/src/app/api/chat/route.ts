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
import { auth } from '@/auth';
import { tools } from '@/lib/toolDefinitions';
import { executeToolCall, formatToolResult, extractNavigation } from '@/lib/toolExecutor';

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
}, customPrompt?: string): string {
  const today = new Date().toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Toronto'
  });

  let basePrompt = `You are Gordie, a guide to Canadian Parliament. Today's date is ${today}.

You have tools to query parliamentary data from a Neo4j database.

**Key Tools:**
- search_hansard: Full-text search of House debates (PRIMARY - use liberally)
- search_mps, get_mp, get_mp_scorecard: MP data, voting, expenses, speeches
- search_bills, get_bill, get_bill_lobbying: Bill tracking and lobbying influence
- get_committees, get_committee: Committee work and testimony
- search_lobby_registrations: Track corporate lobbying

**Usage:**
- Use tools for all queries - don't rely on general knowledge
- Always cite data sources
- Search results auto-show in a "View Results" card - don't mention it
- Help button (?) shows full tool documentation

Provide clear, data-backed answers about Canadian democracy.`;

  // Add custom user prompt if provided
  if (customPrompt && customPrompt.trim().length > 0) {
    basePrompt += `\n\nADDITIONAL USER PREFERENCES:\n${customPrompt.trim()}`;
  }

  if (!context) {
    return basePrompt;
  }

  // Add context-specific instructions
  const contextPrompts: Record<ContextType, string> = {
    general: '',
    mp: `\n\nContext: MP ${context.data?.name || 'Unknown'} (${context.data?.party}, ${context.data?.riding}). Focus on this MP's bills, expenses, committees, votes, petitions.`,
    bill: `\n\nContext: Bill ${context.data?.number}: "${context.data?.title}" (${context.data?.status}, ${context.data?.sponsor}). Focus on progress, votes, committees, lobbying, petitions.`,
    dashboard: `\n\nContext: Dashboard view. Provide high-level insights across MPs, bills, committees, conflicts.`,
    lobbying: `\n\nContext: Lobbying data. Focus on who lobbies whom, active orgs, legislation influence, DPOH meetings.`,
    spending: `\n\nContext: Spending data. Focus on MP expenses, contracts, departments, outliers.`,
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

    // Get user from NextAuth session
    const session = await auth();
    if (!session || !session.user) {
      return Response.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const user = { id: session.user.id };

    // Check quota using PostgreSQL function
    const { data: quotaResult, error: quotaError } = await supabase.rpc(
      'can_user_query',
      { p_user_id: user.id }
    );

    if (quotaError) {
      console.error('Quota check error:', quotaError);
      // In development, allow queries if quota check fails
      console.log('Allowing query despite quota check error (development mode)');
    } else if (quotaResult && !quotaResult.can_query) {
      // Quota check succeeded but user cannot query
      return Response.json(
        {
          error: quotaResult.reason || 'Quota exceeded',
          requires_payment: quotaResult.requires_payment || false,
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

    // Fetch user's custom Gordie prompt if exists
    const { data: userPreferences } = await supabase
      .from('user_preferences')
      .select('custom_gordie_prompt')
      .eq('user_id', user.id)
      .single();

    const customPrompt = userPreferences?.custom_gordie_prompt || '';

    // Build message history
    const systemPrompt = generateSystemPrompt(context, customPrompt);

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

            // Enable tool calling
            let response = await (providerClient as Anthropic).messages.create({
              model: 'claude-sonnet-4-5',
              max_tokens: 4096,
              system: systemPrompt,
              messages: messageHistory,
              tools: tools,
            });

            inputTokens = response.usage.input_tokens;
            outputTokens = response.usage.output_tokens;

            // Track navigation data from tools
            let navigationData: { url: string; message: string } | null = null;

            // Handle tool calls (may need multiple rounds)
            while (response.stop_reason === 'tool_use') {
              const toolUse = response.content.find((block) => block.type === 'tool_use');

              if (!toolUse || toolUse.type !== 'tool_use') break;

              console.log(`[Chat] Tool called: ${toolUse.name}`, toolUse.input);

              // Execute the tool
              const toolResult = await executeToolCall(toolUse.name, toolUse.input as Record<string, any>);

              // Check if tool returned navigation data
              const nav = extractNavigation(toolResult);
              if (nav) {
                navigationData = nav;
              }

              const formattedResult = formatToolResult(toolResult);

              // Add assistant's tool use to history
              messageHistory.push({
                role: 'assistant',
                content: response.content,
              });

              // Add tool result
              messageHistory.push({
                role: 'user',
                content: [
                  {
                    type: 'tool_result',
                    tool_use_id: toolUse.id,
                    content: formattedResult,
                  },
                ],
              });

              // Get Claude's response with the tool results
              response = await (providerClient as Anthropic).messages.create({
                model: 'claude-sonnet-4-5',
                max_tokens: 4096,
                system: systemPrompt,
                messages: messageHistory,
                tools: tools,
              });

              inputTokens += response.usage.input_tokens;
              outputTokens += response.usage.output_tokens;
            }

            // Extract final text response
            for (const block of response.content) {
              if (block.type === 'text') {
                assistantContent += block.text;
              }
            }

            // Stream the final response to client
            const responseData: any = { content: assistantContent };
            if (navigationData) {
              responseData.navigation = navigationData;
            }
            const data = `data: ${JSON.stringify(responseData)}\n\n`;

            // Check if controller is still open before enqueueing
            try {
              controller.enqueue(encoder.encode(data));
            } catch (err) {
              console.error('Controller already closed, response:', err);
              return; // Exit early if controller is closed
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
          const cost = calculateCost(provider, 'claude-sonnet-4-5', inputTokens, outputTokens);

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
              model: provider === 'anthropic' ? 'claude-sonnet-4-5' : 'gpt-4-turbo-preview',
              used_byo_key: usedBYOKey,
              cost_usd: cost,
            })
            .select()
            .single();

          if (assistantMsgError) {
            console.error('Error saving assistant message:', assistantMsgError);
          }

          // Track usage in database (only if not using BYOK)
          // NOTE: We're directly inserting into usage_logs instead of using the RPC function
          // because there are conflicting function signatures in migrations
          if (!usedBYOKey) {
            const { error: usageError } = await supabase
              .from('usage_logs')
              .insert({
                user_id: user.id,
                conversation_id: conversation_id,
                query_date: new Date().toISOString().split('T')[0],
                tokens_total: inputTokens + outputTokens,
                tokens_input: inputTokens,
                tokens_output: outputTokens,
                cost_usd: cost,
                counted_against_quota: true,
                model_used: provider === 'anthropic' ? 'claude-sonnet-4-5' : 'gpt-4-turbo-preview',
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
