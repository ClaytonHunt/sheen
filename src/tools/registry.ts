import { Tool, ToolCategory, ToolResult, ToolContext } from '../utils/types.js';
import { logger } from '../utils/logger.js';

/**
 * Registry for managing and executing tools
 */
export class ToolRegistry {
  private tools: Map<string, Tool>;

  constructor() {
    this.tools = new Map();
  }

  /**
   * Register a tool
   */
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      logger.warn(`Tool '${tool.name}' is already registered. Overwriting.`);
    }
    this.tools.set(tool.name, tool);
    logger.debug(`Registered tool: ${tool.name} (${tool.category})`);
  }

  /**
   * Register multiple tools
   */
  registerAll(tools: Tool[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * Get tool by name
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all tools
   */
  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  getByCategory(category: ToolCategory): Tool[] {
    return this.getAll().filter(tool => tool.category === category);
  }

  /**
   * Check if tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Execute a tool by name
   */
  async execute(
    name: string,
    params: Record<string, any>,
    context: ToolContext
  ): Promise<ToolResult> {
    const tool = this.get(name);
    
    if (!tool) {
      return {
        success: false,
        error: `Tool '${name}' not found`
      };
    }

    // Validate required parameters
    const validationError = this.validateParameters(tool, params);
    if (validationError) {
      return {
        success: false,
        error: validationError
      };
    }

    try {
      logger.debug(`Executing tool: ${name}`, { params });
      const startTime = Date.now();
      const result = await tool.execute(params, context);
      const duration = Date.now() - startTime;
      logger.debug(`Tool '${name}' completed in ${duration}ms`, { result });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Tool '${name}' execution failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Validate tool parameters
   */
  private validateParameters(tool: Tool, params: Record<string, any>): string | null {
    for (const param of tool.parameters) {
      if (param.required && !(param.name in params)) {
        return `Missing required parameter: ${param.name}`;
      }
      
      if (param.name in params) {
        const value = params[param.name];
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        
        if (param.type !== actualType && actualType !== 'undefined') {
          return `Parameter '${param.name}' should be ${param.type}, got ${actualType}`;
        }
      }
    }
    
    return null;
  }

  /**
   * Get tool count
   */
  count(): number {
    return this.tools.size;
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear();
  }

  /**
   * Get tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Generate tool documentation
   */
  generateDocs(): string {
    const lines: string[] = ['# Available Tools\n'];
    
    const categories = new Set(this.getAll().map(t => t.category));
    
    for (const category of categories) {
      const tools = this.getByCategory(category);
      lines.push(`## ${category.toUpperCase()}\n`);
      
      for (const tool of tools) {
        lines.push(`### ${tool.name}`);
        lines.push(`**Description**: ${tool.description}\n`);
        lines.push('**Parameters**:');
        
        for (const param of tool.parameters) {
          const required = param.required ? '(required)' : '(optional)';
          lines.push(`- \`${param.name}\` (${param.type}) ${required}: ${param.description}`);
        }
        
        lines.push('');
      }
    }
    
    return lines.join('\n');
  }
}
