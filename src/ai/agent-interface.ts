/**
 * AI Agent Interface - Provider-agnostic abstraction for AI SDK integration
 * 
 * This interface allows Sheen to support multiple AI engines:
 * - OpenCode (subprocess integration) - v0.1.0 legacy
 * - Direct AI SDK (Anthropic, OpenAI, Google) - v0.2.0+
 * 
 * Design principles:
 * 1. Provider abstraction - easy to switch between engines
 * 2. Feature flags - gradual rollout
 * 3. Tool stability - preserve existing tool semantics
 * 4. Safety first - maintain all safety features
 */

import type { ProjectContext, ExecutionState, AgentConfig, ToolCall } from '../utils/types';

/**
 * Context passed to AI agent for execution
 */
export interface AgentContext {
  projectContext: ProjectContext;
  executionState: ExecutionState;
  configuration: AgentConfig;
  conversationHistory?: ConversationMessage[];
}

/**
 * Result from AI agent execution
 */
export interface AgentResult {
  success: boolean;
  response: string;
  toolCalls: ToolCall[];
  metadata: {
    tokensUsed: number;
    executionTimeMs: number;
    iterationsUsed: number;
  };
}

/**
 * Events emitted during streaming execution
 */
export interface AgentEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'complete' | 'error';
  data: any;
  timestamp: number;
}

/**
 * Conversation message format
 */
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCallId?: string;
  toolName?: string;
  timestamp: Date;
}

/**
 * Tool definition for registration
 * The 'tool' field is the return type from the AI SDK's tool() function
 */
export interface ToolDefinition {
  name: string;
  description: string;
  tool: any; // CoreTool from AI SDK (return type of tool() function)
}

/**
 * Provider-agnostic AI Agent interface
 * 
 * Implementations:
 * - OpenCodeAdapter: Wraps existing OpenCodeClient for backward compatibility
 * - DirectAIAgent: Native AI SDK implementation with streaming and multi-step reasoning
 */
export interface AIAgent {
  /**
   * Execute a prompt with given context and return complete result
   * 
   * @param prompt - User prompt or task description
   * @param context - Execution context (project, state, config)
   * @returns Promise with complete execution result
   */
  execute(prompt: string, context: AgentContext): Promise<AgentResult>;

  /**
   * Stream execution with real-time tool calls and responses
   * 
   * @param prompt - User prompt or task description
   * @param context - Execution context (project, state, config)
   * @returns AsyncIterable of events (text, tool_call, tool_result, complete, error)
   */
  stream(prompt: string, context: AgentContext): AsyncIterable<AgentEvent>;

  /**
   * Register available tools with the agent
   * 
   * @param tools - Array of tool definitions in AI SDK format
   */
  registerTools(tools: ToolDefinition[]): void;

  /**
   * Get conversation history for context management
   * 
   * @returns Array of conversation messages
   */
  getConversation(): ConversationMessage[];

  /**
   * Reset conversation history (e.g., start new session)
   */
  resetConversation(): void;

  /**
   * Get engine name for logging and debugging
   */
  getEngineName(): string;
}

/**
 * Factory function type for creating AI agents
 */
export type AIAgentFactory = (config: AgentConfig) => Promise<AIAgent>;
