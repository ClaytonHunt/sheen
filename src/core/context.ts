import { 
  ConversationContext, 
  ProjectContext, 
  Task, 
  Tool, 
  HistoryEntry,
  ExecutionState 
} from '../utils/types.js';
import { logger } from '../utils/logger.js';

/**
 * Context manager for building conversation context for OpenCode
 * 
 * Manages the conversation history, project context, and available tools
 * that are sent to OpenCode with each request.
 */
export class ContextManager {
  private history: HistoryEntry[] = [];
  private maxHistoryEntries: number = 20; // Keep last 20 entries
  private projectContext: ProjectContext;

  constructor(projectContext: ProjectContext) {
    this.projectContext = projectContext;
  }

  /**
   * Build conversation context for OpenCode
   */
  buildContext(
    currentTask: Task | undefined,
    availableTools: Tool[],
    state: ExecutionState
  ): ConversationContext {
    logger.debug('Building conversation context', { 
      taskId: currentTask?.id,
      toolCount: availableTools.length,
      historySize: this.history.length 
    });

    // Prune history if needed
    this.pruneHistory();

    return {
      projectContext: this.projectContext,
      currentTask,
      recentHistory: [...this.history],
      availableTools
    };
  }

  /**
   * Add user message to history
   */
  addUserMessage(message: string): void {
    this.addHistoryEntry({
      role: 'user',
      content: message,
      timestamp: new Date()
    });
  }

  /**
   * Add assistant message to history
   */
  addAssistantMessage(message: string): void {
    this.addHistoryEntry({
      role: 'assistant',
      content: message,
      timestamp: new Date()
    });
  }

  /**
   * Add tool execution result to history
   */
  addToolResult(toolName: string, result: any): void {
    const resultSummary = this.summarizeToolResult(toolName, result);
    
    this.addHistoryEntry({
      role: 'tool',
      content: `Tool '${toolName}': ${resultSummary}`,
      timestamp: new Date()
    });
  }

  /**
   * Get recent history
   */
  getHistory(): HistoryEntry[] {
    return [...this.history];
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    logger.debug('Clearing conversation history');
    this.history = [];
  }

  /**
   * Get history summary for debugging
   */
  getHistorySummary(): string {
    const userCount = this.history.filter(h => h.role === 'user').length;
    const assistantCount = this.history.filter(h => h.role === 'assistant').length;
    const toolCount = this.history.filter(h => h.role === 'tool').length;
    
    return `History: ${this.history.length} entries (${userCount} user, ${assistantCount} assistant, ${toolCount} tool)`;
  }

  /**
   * Add history entry
   */
  private addHistoryEntry(entry: HistoryEntry): void {
    this.history.push(entry);
    
    // Auto-prune if too many entries
    if (this.history.length > this.maxHistoryEntries * 1.5) {
      this.pruneHistory();
    }
  }

  /**
   * Prune old history entries to keep size manageable
   */
  private pruneHistory(): void {
    if (this.history.length <= this.maxHistoryEntries) {
      return;
    }

    // Keep most recent entries
    const removed = this.history.length - this.maxHistoryEntries;
    this.history = this.history.slice(-this.maxHistoryEntries);
    
    logger.debug(`Pruned ${removed} old history entries`);
  }

  /**
   * Summarize tool result for history
   */
  private summarizeToolResult(toolName: string, result: any): string {
    if (!result) {
      return 'no result';
    }

    if (typeof result === 'object') {
      if (result.success === false) {
        return `failed - ${result.error || 'unknown error'}`;
      }
      
      if (result.success === true) {
        // Summarize based on tool type
        if (result.output) {
          const outputStr = String(result.output);
          const preview = outputStr.length > 100 
            ? outputStr.substring(0, 100) + '...' 
            : outputStr;
          return `success - ${preview}`;
        }
        
        if (result.filesChanged) {
          return `success - ${result.filesChanged.length} file(s) changed`;
        }
        
        return 'success';
      }
      
      return JSON.stringify(result).substring(0, 100);
    }

    return String(result).substring(0, 100);
  }

  /**
   * Format context as string for logging/debugging
   */
  formatContextSummary(context: ConversationContext): string {
    const lines: string[] = [];
    
    lines.push('=== Conversation Context ===');
    lines.push(`Project: ${context.projectContext.type} (${context.projectContext.rootDir})`);
    
    if (context.projectContext.framework) {
      lines.push(`Framework: ${context.projectContext.framework}`);
    }
    
    if (context.currentTask) {
      lines.push(`Task: ${context.currentTask.id} - ${context.currentTask.description}`);
    }
    
    lines.push(`Tools: ${context.availableTools.length} available`);
    lines.push(`History: ${context.recentHistory.length} entries`);
    lines.push('=========================');
    
    return lines.join('\n');
  }

  /**
   * Estimate context size (rough approximation)
   */
  estimateContextSize(context: ConversationContext): number {
    // Rough token estimate: ~4 chars per token
    let chars = 0;
    
    // History content
    for (const entry of context.recentHistory) {
      chars += entry.content.length;
    }
    
    // Tool descriptions
    for (const tool of context.availableTools) {
      chars += tool.name.length;
      chars += tool.description.length;
      chars += JSON.stringify(tool.parameters).length;
    }
    
    // Task description
    if (context.currentTask) {
      chars += context.currentTask.description.length;
    }
    
    // Project context
    chars += 500; // Rough estimate for project metadata
    
    return Math.ceil(chars / 4); // Convert to approximate tokens
  }
}
