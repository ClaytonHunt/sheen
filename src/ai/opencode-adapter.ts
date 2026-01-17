/**
 * OpenCode Adapter - Wraps existing OpenCodeClient to implement AIAgent interface
 * 
 * This adapter provides backward compatibility during the migration to Direct AI SDK.
 * It maintains all existing OpenCode functionality while conforming to the AIAgent interface.
 * 
 * Status: Fallback implementation for v0.2.0
 * Primary: Direct AI SDK (DirectAIAgent)
 */

import { OpenCodeClient } from '../opencode/client';
import type { 
  AIAgent, 
  AgentContext, 
  AgentResult, 
  AgentEvent, 
  ToolDefinition,
  ConversationMessage 
} from './agent-interface';
import type { ConversationContext, HistoryEntry } from '../utils/types';
import { logger } from '../utils/logger';

/**
 * Adapter that wraps OpenCodeClient to implement AIAgent interface
 */
export class OpenCodeAdapter implements AIAgent {
  private client: OpenCodeClient;
  private conversationHistory: ConversationMessage[] = [];
  private tools: ToolDefinition[] = [];

  constructor(client: OpenCodeClient) {
    this.client = client;
    logger.info('Initialized OpenCodeAdapter (legacy engine)');
  }

  /**
   * Execute a prompt with OpenCode and return complete result
   */
  async execute(prompt: string, context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    
    logger.debug('OpenCodeAdapter: Executing prompt', { 
      prompt: prompt.substring(0, 100),
      engine: 'opencode' 
    });

    try {
      // Add user message to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: prompt,
        timestamp: new Date()
      });

      // Build conversation context for OpenCode
      const opencodeContext: ConversationContext = this.buildOpenCodeContext(context);

      // Execute with OpenCode client
      const opencodeResponse = await this.client.execute(
        prompt,
        opencodeContext,
        true // Continue session
      );

      // Add assistant response to history
      if (opencodeResponse.thinking) {
        this.conversationHistory.push({
          role: 'assistant',
          content: opencodeResponse.thinking,
          timestamp: new Date()
        });
      }

      // Convert to AgentResult format
      const executionTime = Date.now() - startTime;
      
      const result: AgentResult = {
        success: true,
        response: opencodeResponse.thinking || '',
        toolCalls: opencodeResponse.toolCalls || [],
        metadata: {
          tokensUsed: 0, // OpenCode doesn't provide token count
          executionTimeMs: executionTime,
          iterationsUsed: 1
        }
      };

      logger.debug('OpenCodeAdapter: Execution complete', {
        executionTimeMs: executionTime,
        toolCallsCount: result.toolCalls.length
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('OpenCodeAdapter: Execution failed', error instanceof Error ? error : new Error(errorMessage));

      return {
        success: false,
        response: `Error: ${errorMessage}`,
        toolCalls: [],
        metadata: {
          tokensUsed: 0,
          executionTimeMs: Date.now() - startTime,
          iterationsUsed: 0
        }
      };
    }
  }

  /**
   * Stream execution (OpenCode doesn't support true streaming, so we emulate it)
   */
  async *stream(prompt: string, context: AgentContext): AsyncIterable<AgentEvent> {
    logger.debug('OpenCodeAdapter: Streaming execution (emulated)');

    // OpenCode doesn't support true streaming, so we execute and emit events afterward
    const result = await this.execute(prompt, context);

    // Emit text event
    yield {
      type: 'text',
      data: result.response,
      timestamp: Date.now()
    };

    // Emit tool call events
    for (const toolCall of result.toolCalls) {
      yield {
        type: 'tool_call',
        data: toolCall,
        timestamp: Date.now()
      };
    }

    // Emit complete event
    yield {
      type: 'complete',
      data: result,
      timestamp: Date.now()
    };
  }

  /**
   * Register tools (OpenCode uses its own built-in tools, so this is a no-op)
   */
  registerTools(tools: ToolDefinition[]): void {
    this.tools = tools;
    logger.debug(`OpenCodeAdapter: Registered ${tools.length} tools (for reference only)`);
    // OpenCode manages its own tools, so we just store these for reference
  }

  /**
   * Get conversation history
   */
  getConversation(): ConversationMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Reset conversation history
   */
  resetConversation(): void {
    this.conversationHistory = [];
    this.client.resetSession();
    logger.debug('OpenCodeAdapter: Conversation reset');
  }

  /**
   * Get engine name
   */
  getEngineName(): string {
    return 'opencode';
  }

  /**
   * Build OpenCode-compatible conversation context
   */
  private buildOpenCodeContext(context: AgentContext): ConversationContext {
    // Convert AIAgent context to OpenCode context format
    const historyEntries: HistoryEntry[] = this.conversationHistory.map(msg => ({
      role: msg.role === 'system' ? 'assistant' : msg.role,
      content: msg.content,
      timestamp: msg.timestamp
    }));

    return {
      projectContext: context.projectContext,
      currentTask: context.executionState.currentTask,
      recentHistory: historyEntries,
      availableTools: [] // OpenCode doesn't need tool list passed explicitly
    };
  }

  /**
   * Check if OpenCode is available
   */
  async isAvailable(): Promise<boolean> {
    return await this.client.isAvailable();
  }
}
