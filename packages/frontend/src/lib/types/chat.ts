/**
 * Type definitions for AI Chat System
 * Matches Supabase database schema
 */

// ============================================
// Database Types
// ============================================

export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'usage_only';
export type SubscriptionStatus = 'active' | 'canceled' | 'suspended' | 'past_due';
export type AIProvider = 'anthropic' | 'openai';
export type MessageRole = 'user' | 'assistant' | 'system' | 'function';
export type ContextType = 'general' | 'mp' | 'bill' | 'dashboard' | 'lobbying' | 'spending';

export interface UserSubscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;

  // Quota settings
  daily_quota: number;
  lifetime_quota?: number; // Only for free tier

  // Overage settings
  allow_overages: boolean;
  overage_limit: number;
  current_overage_amount: number;

  // BYOK flags
  uses_byo_key: boolean;

  // Billing period
  current_period_start?: string;
  current_period_end?: string;

  // Metadata
  created_at: string;
  updated_at: string;
  canceled_at?: string;
}

export interface UserAPIKey {
  id: string;
  user_id: string;
  provider: AIProvider;
  encrypted_key: string;
  encryption_iv: string;
  encryption_tag: string;
  is_active: boolean;
  last_validated_at?: string;
  validation_error?: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id?: string;
  title: string;

  // Context awareness
  context_type?: ContextType;
  context_id?: string;
  context_data?: Record<string, any>;

  // Conversation state
  message_count: number;
  total_tokens: number;
  is_pinned: boolean;
  is_archived: boolean;

  // Expiration
  expires_at?: string;

  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;

  // Token tracking
  tokens_input?: number;
  tokens_output?: number;
  tokens_total?: number;

  // AI provider info
  provider?: AIProvider;
  model?: string;
  used_byo_key: boolean;

  // Function calling
  function_calls?: any[];
  function_results?: any[];

  // Cost tracking
  cost_usd?: number;

  // Navigation (for tool-triggered page navigation)
  navigation?: {
    url: string;
    message: string;
  };

  created_at: string;
}

export interface UsageLog {
  id: string;
  user_id: string;
  conversation_id?: string;
  message_id?: string;

  // Date tracking
  query_date: string;
  query_timestamp: string;

  // Token usage
  tokens_input: number;
  tokens_output: number;
  tokens_total: number;

  // Cost tracking
  cost_usd: number;
  provider: AIProvider;
  model?: string;
  used_byo_key: boolean;

  // Quota tracking
  counted_against_quota: boolean;
  was_overage: boolean;
  overage_charge: number;

  created_at: string;
}

export interface CreditPack {
  id: string;
  user_id: string;

  // Credits
  credits_purchased: number;
  credits_remaining: number;
  credits_used: number;

  // Pricing
  price_paid: number;
  price_per_credit: number;

  // Stripe info
  stripe_payment_intent_id?: string;

  // Expiration
  expires_at?: string;

  created_at: string;
  depleted_at?: string;
}

// ============================================
// API Response Types
// ============================================

export interface QuotaCheckResult {
  can_query: boolean;
  reason: string;
  requires_payment: boolean;
  queries_remaining?: number;
  resets_at?: string;
}

export interface UsageStats {
  queries_today: number;
  queries_this_month: number;
  tokens_today: number;
  cost_today: number;
  overage_amount: number;
}

// ============================================
// Chat UI Types
// ============================================

export interface ChatState {
  // Current conversation
  conversation: Conversation | null;
  messages: Message[];

  // Input state
  input: string;
  isLoading: boolean;
  error: string | null;

  // Subscription and quota
  subscription: UserSubscription | null;
  quotaStatus: QuotaCheckResult | null;
  usageStats: UsageStats | null;

  // API keys (BYOK)
  hasAnthropicKey: boolean;
  hasOpenAIKey: boolean;

  // UI state
  isOpen: boolean;
  isMinimized: boolean;
  isExpanded: boolean;

  // Context
  contextType?: ContextType;
  contextId?: string;
  contextData?: Record<string, any>;
}

export interface ChatActions {
  // Conversation management
  setConversation: (conversation: Conversation | null) => void;
  createConversation: (context?: { type: ContextType; id?: string; data?: Record<string, any> }) => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;

  // Message management
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  sendMessage: (content: string) => Promise<void>;

  // Input state
  setInput: (input: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Quota and subscription
  setSubscription: (subscription: UserSubscription | null) => void;
  checkQuota: () => Promise<QuotaCheckResult>;
  refreshUsageStats: () => Promise<void>;

  // API keys
  setHasAnthropicKey: (has: boolean) => void;
  setHasOpenAIKey: (has: boolean) => void;

  // UI state
  toggleOpen: () => void;
  toggleMinimize: () => void;
  toggleExpanded: () => void;

  // Context
  setContext: (type?: ContextType, id?: string, data?: Record<string, any>) => void;
  clearContext: () => void;

  // Reset
  reset: () => void;
}

// ============================================
// Chat Context Provider Types
// ============================================

export interface ChatContextValue extends ChatState, ChatActions {}

// ============================================
// Suggested Prompts
// ============================================

export interface SuggestedPrompt {
  label: string;
  prompt: string;
  icon?: string;
}

export interface ContextPrompts {
  general: SuggestedPrompt[];
  mp: SuggestedPrompt[];
  bill: SuggestedPrompt[];
  dashboard: SuggestedPrompt[];
  lobbying: SuggestedPrompt[];
  spending: SuggestedPrompt[];
}
