/**
 * DirectAIAgent - Native AI SDK implementation for autonomous operation
 * 
 * Uses Vercel AI SDK with native tool calling and streaming.
 * Supports multiple providers: Anthropic, OpenAI, Google
 * 
 * Features:
 * - Native tool calling (no text parsing)
 * - Streaming responses with real-time tool execution
 * - Multi-step autonomous reasoning (maxSteps)
 * - Conversation history management
 * - Provider-agnostic (configured via ProviderFactory)
 */

import { streamText, generateText, LanguageModel } from 'ai';
import type {
  AIAgent,
  AgentContext,
  AgentResult,
  AgentEvent,
  ToolDefinition,
  ConversationMessage,
} from './agent-interface';
import { ConversationManager, CoreMessage } from './conversation-manager';
import type { ToolCall, AIConfig } from '../utils/types';

/**
 * DirectAIAgent implementation using AI SDK
 */
export class DirectAIAgent implements AIAgent {
  private model: LanguageModel;
  private tools: Record<string, any> = {};
  private conversation: ConversationManager;
  private providerName: string;

  constructor(model: LanguageModel, config: AIConfig, providerName: string = 'unknown') {
    this.model = model;
    this.providerName = providerName;
    
    // Create conversation manager with config
    this.conversation = new ConversationManager({
      systemPrompt: this.getSystemPrompt(),
      maxTokens: config.maxTokens || 200000,
      contextWindowSize: config.contextWindowSize || 180000,
      enablePruning: config.enablePruning !== false,
    });
  }

  /**
   * Get system prompt for the agent
   */
  private getSystemPrompt(): string {
    return `You are Sheen, an autonomous coding agent. Your goal is to complete tasks independently by:

1. Reading and understanding the codebase
2. Planning your approach
3. Making incremental changes
4. Testing your changes
5. Committing when logical units are complete

Be methodical, test frequently, and commit often with clear messages.`;
  }

  /**
   * Execute prompt with AI SDK and return complete result
   */
  async execute(prompt: string, context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();

    // Add user message to conversation
    this.conversation.addUserMessage(prompt);

    try {
      // Generate with AI SDK
      const result = await generateText({
        model: this.model,
        messages: this.conversation.getCoreMessages(),
        tools: this.tools,
        // Note: AI SDK v6+ handles multi-step tool calling automatically
      });

      // Add assistant response to conversation
      this.conversation.addAssistantMessage(result.text);

      // Extract tool calls from result
      const toolCalls: ToolCall[] = this.extractToolCalls(result);

      // Calculate execution time
      const executionTimeMs = Date.now() - startTime;

      return {
        success: true,
        response: result.text,
        toolCalls,
        metadata: {
          tokensUsed: result.usage?.totalTokens || 0,
          executionTimeMs,
          iterationsUsed: toolCalls.length || 1,
        },
      };
    } catch (error: any) {
      const executionTimeMs = Date.now() - startTime;

      return {
        success: false,
        response: `Error: ${error.message}`,
        toolCalls: [],
        metadata: {
          tokensUsed: 0,
          executionTimeMs,
          iterationsUsed: 0,
        },
      };
    }
  }

  /**
   * Stream execution with real-time events
   */
  async *stream(prompt: string, context: AgentContext): AsyncIterable<AgentEvent> {
    // Add user message to conversation
    this.conversation.addUserMessage(prompt);

    try {
      const result = streamText({
        model: this.model,
        messages: this.conversation.getCoreMessages(),
        tools: this.tools,
        // Note: AI SDK v6+ handles multi-step tool calling automatically

        onStepFinish: (step) => {
          // Log step completion for debugging
          console.log(`[DirectAIAgent] Step finished with ${step.toolCalls?.length || 0} tool calls`);
        },
      });

      // Stream text chunks
      for await (const chunk of result.textStream) {
        yield {
          type: 'text',
          data: chunk,
          timestamp: Date.now(),
        };
      }

      // Get final result
      const finalResult = await result.text;
      const usage = await result.usage;

      // Add to conversation
      this.conversation.addAssistantMessage(finalResult);

      // Emit complete event
      yield {
        type: 'complete',
        data: {
          text: finalResult,
          usage,
        },
        timestamp: Date.now(),
      };
    } catch (error: any) {
      yield {
        type: 'error',
        data: {
          error: error.message,
          stack: error.stack,
        },
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Register tools with the agent
   */
  registerTools(tools: ToolDefinition[]): void {
    for (const toolDef of tools) {
      this.tools[toolDef.name] = toolDef.tool;
    }
  }

  /**
   * Get conversation history
   */
  getConversation(): ConversationMessage[] {
    return this.conversation.getMessages();
  }

  /**
   * Reset conversation history
   */
  resetConversation(): void {
    this.conversation.clear();
  }

  /**
   * Get engine name
   */
  getEngineName(): string {
    return `direct-ai-sdk (${this.providerName})`;
  }

  /**
   * Extract tool calls from AI SDK result
   */
  private extractToolCalls(result: any): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    if (result.steps) {
      for (const step of result.steps) {
        if (step.toolCalls) {
          for (const toolCall of step.toolCalls) {
            toolCalls.push({
              tool: toolCall.toolName,
              parameters: toolCall.args || {},
              id: toolCall.toolCallId || `tool-${Date.now()}`,
            });
          }
        }
      }
    }

    return toolCalls;
  }
}
