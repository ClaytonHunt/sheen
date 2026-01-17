/**
 * Conversation Manager - Manages conversation history with context window management
 * 
 * Features:
 * - Message history management (add/get/clear)
 * - Token counting (estimate, not exact)
 * - Context window pruning logic
 * - System prompt preservation
 * 
 * Designed for DirectAIAgent to manage conversation state across multiple turns.
 */

import type { ConversationMessage } from './agent-interface';
import { logger } from '../utils/logger';

/**
 * Message format compatible with AI SDK
 */
export interface CoreMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Manages conversation history with intelligent pruning
 */
export class ConversationManager {
  private messages: ConversationMessage[] = [];
  private systemPrompt: string;
  private maxTokens: number;
  private contextWindowSize: number;
  private enablePruning: boolean;

  constructor(config: {
    systemPrompt: string;
    maxTokens: number;
    contextWindowSize: number;
    enablePruning: boolean;
  }) {
    this.systemPrompt = config.systemPrompt;
    this.maxTokens = config.maxTokens;
    this.contextWindowSize = config.contextWindowSize;
    this.enablePruning = config.enablePruning;

    // Add system message at start
    this.messages.push({
      role: 'system',
      content: this.systemPrompt,
      timestamp: new Date()
    });

    logger.debug('ConversationManager initialized', {
      maxTokens: this.maxTokens,
      contextWindowSize: this.contextWindowSize,
      enablePruning: this.enablePruning
    });
  }

  /**
   * Add a user message to the conversation
   */
  addUserMessage(content: string): void {
    this.messages.push({
      role: 'user',
      content,
      timestamp: new Date()
    });

    logger.debug('Added user message', { length: content.length });

    // Check if pruning is needed
    if (this.enablePruning) {
      this.pruneIfNeeded();
    }
  }

  /**
   * Add an assistant message to the conversation
   */
  addAssistantMessage(content: string): void {
    this.messages.push({
      role: 'assistant',
      content,
      timestamp: new Date()
    });

    logger.debug('Added assistant message', { length: content.length });

    // Check if pruning is needed
    if (this.enablePruning) {
      this.pruneIfNeeded();
    }
  }

  /**
   * Add a tool result message to the conversation
   */
  addToolResult(toolCallId: string, toolName: string, result: any): void {
    this.messages.push({
      role: 'tool',
      content: JSON.stringify(result),
      toolCallId,
      toolName,
      timestamp: new Date()
    });

    logger.debug('Added tool result', { toolName, toolCallId });
  }

  /**
   * Get all messages in the conversation
   */
  getMessages(): ConversationMessage[] {
    return [...this.messages];
  }

  /**
   * Get messages in CoreMessage format for AI SDK
   */
  getCoreMessages(): CoreMessage[] {
    return this.messages
      .filter(msg => msg.role !== 'tool') // Filter out tool messages for AI SDK
      .map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }));
  }

  /**
   * Get the number of messages in the conversation
   */
  getMessageCount(): number {
    return this.messages.length;
  }

  /**
   * Estimate token count for the conversation
   * This is a rough estimate: ~4 characters per token
   */
  estimateTokenCount(): number {
    const totalChars = this.messages.reduce((sum, msg) => sum + msg.content.length, 0);
    return Math.ceil(totalChars / 4);
  }

  /**
   * Clear all messages except system prompt
   */
  clear(): void {
    const systemMessage = this.messages.find(msg => msg.role === 'system');
    this.messages = systemMessage ? [systemMessage] : [];
    logger.debug('Conversation cleared');
  }

  /**
   * Reset to initial state with new system prompt
   */
  reset(newSystemPrompt?: string): void {
    if (newSystemPrompt) {
      this.systemPrompt = newSystemPrompt;
    }

    this.messages = [{
      role: 'system',
      content: this.systemPrompt,
      timestamp: new Date()
    }];

    logger.debug('Conversation reset', { systemPrompt: this.systemPrompt.substring(0, 50) });
  }

  /**
   * Prune old messages when approaching token limit
   * Strategy:
   * 1. Always keep system prompt (first message)
   * 2. Always keep last N messages (recent context)
   * 3. Remove oldest middle messages first
   */
  private pruneIfNeeded(): void {
    const estimatedTokens = this.estimateTokenCount();
    const threshold = this.contextWindowSize * 0.8; // Prune at 80% of context window

    if (estimatedTokens < threshold) {
      return; // No pruning needed
    }

    logger.debug('Pruning conversation', {
      estimatedTokens,
      threshold,
      messageCount: this.messages.length
    });

    const systemMessage = this.messages[0]; // System prompt
    const recentCount = 10; // Keep last 10 messages
    const recentMessages = this.messages.slice(-recentCount);

    // Remove oldest messages in the middle
    const keepMessages = [systemMessage, ...recentMessages];
    
    // Ensure we actually removed messages
    if (keepMessages.length < this.messages.length) {
      this.messages = keepMessages;
      
      const newTokenCount = this.estimateTokenCount();
      logger.info('Conversation pruned', {
        removedMessages: this.messages.length - keepMessages.length,
        newMessageCount: this.messages.length,
        newTokenCount
      });
    } else {
      logger.warn('Unable to prune: all messages are recent or system');
    }
  }

  /**
   * Prune to a specific token limit
   * More aggressive pruning for explicit limits
   */
  pruneToLimit(tokenLimit: number): void {
    let currentTokens = this.estimateTokenCount();

    if (currentTokens <= tokenLimit) {
      return; // Already within limit
    }

    logger.debug('Pruning to token limit', {
      currentTokens,
      targetLimit: tokenLimit
    });

    const systemMessage = this.messages[0];
    let keepCount = 5; // Minimum messages to keep

    // Iteratively reduce messages until under limit
    while (currentTokens > tokenLimit && keepCount > 1) {
      const recentMessages = this.messages.slice(-keepCount);
      this.messages = [systemMessage, ...recentMessages];
      currentTokens = this.estimateTokenCount();
      keepCount--;
    }

    logger.info('Pruned to token limit', {
      finalTokens: currentTokens,
      messageCount: this.messages.length
    });
  }

  /**
   * Summarize conversation for long sessions
   * This could be enhanced to use AI to generate summaries
   */
  async summarize(): Promise<string> {
    const messageCount = this.messages.length;
    const tokenCount = this.estimateTokenCount();
    const timeRange = this.getTimeRange();

    const summary = [
      `Conversation Summary:`,
      `- Messages: ${messageCount}`,
      `- Estimated tokens: ${tokenCount}`,
      `- Time range: ${timeRange}`,
      `- System prompt: ${this.systemPrompt.substring(0, 100)}...`
    ].join('\n');

    return summary;
  }

  /**
   * Get time range of conversation
   */
  private getTimeRange(): string {
    if (this.messages.length === 0) {
      return 'No messages';
    }

    const first = this.messages[0].timestamp;
    const last = this.messages[this.messages.length - 1].timestamp;
    const durationMs = last.getTime() - first.getTime();
    const durationMin = Math.floor(durationMs / 1000 / 60);

    return `${durationMin} minutes`;
  }

  /**
   * Export conversation to JSON for debugging
   */
  exportToJSON(): string {
    return JSON.stringify({
      systemPrompt: this.systemPrompt,
      messages: this.messages,
      metadata: {
        messageCount: this.messages.length,
        estimatedTokens: this.estimateTokenCount(),
        timeRange: this.getTimeRange()
      }
    }, null, 2);
  }
}
