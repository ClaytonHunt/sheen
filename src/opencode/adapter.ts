import { ToolRegistry } from '../tools/registry.js';
import { ToolCall, ToolContext, ToolExecutionResult, ProjectContext } from '../utils/types.js';
import { logger } from '../utils/logger.js';

/**
 * Adapter for executing tool calls from OpenCode and formatting results
 */
export class ToolCallAdapter {
  private toolRegistry: ToolRegistry;
  private projectContext: ProjectContext;

  constructor(toolRegistry: ToolRegistry, projectContext: ProjectContext) {
    this.toolRegistry = toolRegistry;
    this.projectContext = projectContext;
  }

  /**
   * Execute tool calls from OpenCode
   */
  async executeToolCalls(
    toolCalls: ToolCall[],
    context: ToolContext
  ): Promise<ToolExecutionResult[]> {
    const results: ToolExecutionResult[] = [];

    for (const toolCall of toolCalls) {
      logger.info(`Executing tool: ${toolCall.tool}`);
      
      const startTime = Date.now();
      const result = await this.toolRegistry.execute(
        toolCall.tool,
        toolCall.parameters,
        context
      );
      const duration = Date.now() - startTime;

      results.push({
        toolCall,
        result,
        duration
      });

      // Log result
      if (result.success) {
        logger.info(`Tool '${toolCall.tool}' succeeded in ${duration}ms`);
      } else {
        logger.error(`Tool '${toolCall.tool}' failed: ${result.error}`);
      }
    }

    return results;
  }

  /**
   * Parse tool calls from OpenCode output
   * 
   * OpenCode may output tool calls in various formats. This method attempts to
   * parse them. For now, we support a simple JSON format:
   * 
   * TOOL_CALL: {"tool": "tool_name", "parameters": {...}, "id": "unique_id"}
   */
  parseToolCalls(output: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];
    
    // Look for TOOL_CALL markers in output
    // Match JSON objects that can span multiple lines
    const toolCallPattern = /TOOL_CALL:\s*(\{(?:[^{}]|\{[^{}]*\})*\})/g;
    let match: RegExpExecArray | null;
    
    while ((match = toolCallPattern.exec(output)) !== null) {
      try {
        const toolCall = JSON.parse(match[1]) as ToolCall;
        
        // Validate tool call structure
        if (toolCall.tool && toolCall.parameters) {
          // Add ID if not present
          if (!toolCall.id) {
            toolCall.id = `tool_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          }
          
          toolCalls.push(toolCall);
          logger.debug(`Parsed tool call: ${toolCall.tool}`, { toolCall });
        }
      } catch (error) {
        logger.warn(`Failed to parse tool call: ${match[1]}`);
      }
    }
    
    return toolCalls;
  }

  /**
   * Format tool results for OpenCode
   * 
   * Formats the results in a way that OpenCode can understand and use
   * in subsequent operations.
   */
  formatToolResults(results: ToolExecutionResult[]): string {
    if (results.length === 0) {
      return 'No tool calls executed.';
    }

    const lines: string[] = ['# Tool Execution Results\n'];

    for (const result of results) {
      lines.push(`## Tool: ${result.toolCall.tool}`);
      lines.push(`**Parameters**: ${JSON.stringify(result.toolCall.parameters)}`);
      lines.push(`**Duration**: ${result.duration}ms`);
      lines.push(`**Status**: ${result.result.success ? 'SUCCESS' : 'FAILED'}`);
      
      if (result.result.success) {
        if (result.result.output !== undefined) {
          // Format output based on type
          if (typeof result.result.output === 'string') {
            lines.push(`**Output**:\n\`\`\`\n${result.result.output}\n\`\`\``);
          } else if (Array.isArray(result.result.output)) {
            lines.push(`**Output**: ${result.result.output.length} items`);
            lines.push(`\`\`\`json\n${JSON.stringify(result.result.output, null, 2)}\n\`\`\``);
          } else {
            lines.push(`\`\`\`json\n${JSON.stringify(result.result.output, null, 2)}\n\`\`\``);
          }
        }
        
        if (result.result.filesChanged && result.result.filesChanged.length > 0) {
          lines.push(`**Files Changed**: ${result.result.filesChanged.join(', ')}`);
        }
      } else {
        lines.push(`**Error**: ${result.result.error}`);
      }
      
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format tool definitions for OpenCode prompt
   * 
   * Provides OpenCode with information about available tools
   */
  formatToolDefinitions(): string {
    const tools = this.toolRegistry.getAll();
    
    if (tools.length === 0) {
      return 'No tools available.';
    }

    const lines: string[] = ['# Available Tools\n'];
    lines.push('You can use the following tools by outputting TOOL_CALL: followed by JSON.\n');
    lines.push('Format: TOOL_CALL: {"tool": "tool_name", "parameters": {...}}\n');

    for (const tool of tools) {
      lines.push(`## ${tool.name}`);
      lines.push(`**Description**: ${tool.description}`);
      lines.push(`**Category**: ${tool.category}`);
      lines.push('**Parameters**:');
      
      for (const param of tool.parameters) {
        const required = param.required ? '(required)' : '(optional)';
        const defaultVal = param.default !== undefined ? ` [default: ${param.default}]` : '';
        lines.push(`  - \`${param.name}\` (${param.type}) ${required}: ${param.description}${defaultVal}`);
      }
      
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Create a summary of tool execution for logging
   */
  summarizeExecution(results: ToolExecutionResult[]): string {
    const successful = results.filter(r => r.result.success).length;
    const failed = results.filter(r => !r.result.success).length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    
    const parts: string[] = [];
    parts.push(`Executed ${results.length} tool call(s)`);
    parts.push(`${successful} succeeded, ${failed} failed`);
    parts.push(`Total time: ${totalDuration}ms`);
    
    const filesChanged = new Set<string>();
    for (const result of results) {
      if (result.result.filesChanged) {
        result.result.filesChanged.forEach(f => filesChanged.add(f));
      }
    }
    
    if (filesChanged.size > 0) {
      parts.push(`${filesChanged.size} file(s) modified`);
    }
    
    return parts.join(', ');
  }

  /**
   * Validate tool call before execution
   */
  validateToolCall(toolCall: ToolCall): { valid: boolean; error?: string } {
    // Check if tool exists
    if (!this.toolRegistry.has(toolCall.tool)) {
      return {
        valid: false,
        error: `Tool '${toolCall.tool}' not found`
      };
    }

    // Check parameters
    if (!toolCall.parameters || typeof toolCall.parameters !== 'object') {
      return {
        valid: false,
        error: 'Invalid parameters format'
      };
    }

    return { valid: true };
  }
}
