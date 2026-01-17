import { ConversationContext, Task, Tool, ProjectContext } from '../utils/types.js';
import { logger } from '../utils/logger.js';

/**
 * Prompt builder for constructing prompts to send to OpenCode
 * 
 * Builds comprehensive prompts that include:
 * - System instructions for sheen's purpose
 * - Project context and structure
 * - Current task description
 * - Available tools with descriptions
 * - Recent conversation history
 */
export class PromptBuilder {
  /**
   * Build complete prompt for OpenCode
   */
  buildPrompt(
    userPrompt: string,
    context: ConversationContext
  ): string {
    logger.debug('Building prompt', { 
      userPromptLength: userPrompt.length,
      toolCount: context.availableTools.length 
    });

    const sections: string[] = [];

    // 1. System prompt
    sections.push(this.buildSystemPrompt());
    sections.push('');

    // 2. Project context
    sections.push(this.buildProjectContext(context.projectContext));
    sections.push('');

    // 3. Available tools
    sections.push(this.buildToolsSection(context.availableTools));
    sections.push('');

    // 4. Current task
    if (context.currentTask) {
      sections.push(this.buildTaskSection(context.currentTask));
      sections.push('');
    }

    // 5. Recent history (if any)
    if (context.recentHistory.length > 0) {
      sections.push(this.buildHistorySection(context.recentHistory));
      sections.push('');
    }

    // 6. User prompt
    sections.push('## Current Request');
    sections.push('');
    sections.push(userPrompt);
    sections.push('');

    // 7. Instructions
    sections.push(this.buildInstructions());

    const fullPrompt = sections.join('\n');
    
    logger.debug(`Prompt built: ${fullPrompt.length} characters`);
    
    return fullPrompt;
  }

  /**
   * Build system prompt explaining sheen's purpose
   */
  private buildSystemPrompt(): string {
    return `# Sheen - Autonomous Development Agent

You are Sheen, an autonomous coding agent helping to implement software development tasks.

**IMPORTANT - Autonomous Operation**:
- You are running in AUTONOMOUS mode without human supervision
- DO NOT ask questions or wait for user input
- Make reasonable decisions based on context and best practices
- Use sensible defaults when specifics are unclear
- Proceed with implementation immediately

**Your Role**:
- Execute development tasks autonomously in small, incremental phases
- Use available tools to read, write, and modify files
- Make commits when logical units of work are complete
- Follow best practices for the detected project type
- Provide clear explanations of your actions

**Working Style - Phase-Based Execution**:
- Work in small segments (15-30 minutes max per phase)
- Complete one logical unit of work per phase
- Test your changes after each phase when possible
- Commit at phase boundaries with descriptive messages
- Clearly mark when a phase is complete
- Plan the next phase before starting it

**Phase Completion Format**:
When you complete a phase, clearly state:
- What was accomplished in this phase
- What files were created/modified
- What testing was done (if applicable)
- What the next phase should be
- Whether you're ready to continue to the next phase

**Phase Segmentation Guidelines**:
- One component, feature, or file per phase
- Setup/configuration before implementation
- Implementation before testing
- Testing before documentation
- Each phase should be a committable unit of work

**Example**: Instead of "implement user authentication" in one phase, break it into:
1. Set up auth dependencies
2. Create user model
3. Implement registration
4. Implement login
5. Add middleware
6. Write tests
... and so on.`;
  }

  /**
   * Build project context section
   */
  private buildProjectContext(projectContext: ProjectContext): string {
    const lines: string[] = [];
    
    lines.push('## Project Context');
    lines.push('');
    lines.push(`**Type**: ${projectContext.type}`);
    lines.push(`**Directory**: ${projectContext.rootDir}`);
    
    if (projectContext.language) {
      lines.push(`**Language**: ${projectContext.language}`);
    }
    
    if (projectContext.framework) {
      lines.push(`**Framework**: ${projectContext.framework}`);
    }
    
    if (projectContext.packageManager) {
      lines.push(`**Package Manager**: ${projectContext.packageManager}`);
    }
    
    if (projectContext.git) {
      lines.push('');
      lines.push('**Git**:');
      lines.push(`- Initialized: ${projectContext.git.initialized}`);
      if (projectContext.git.branch) {
        lines.push(`- Branch: ${projectContext.git.branch}`);
      }
    }
    
    if (projectContext.conventions.testFramework) {
      lines.push('');
      lines.push(`**Test Framework**: ${projectContext.conventions.testFramework}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Build tools section
   */
  private buildToolsSection(tools: Tool[]): string {
    const lines: string[] = [];
    
    lines.push('## Available Tools');
    lines.push('');
    lines.push('You have access to the following tools:');
    lines.push('');
    
    // Group tools by category
    const toolsByCategory = this.groupToolsByCategory(tools);
    
    for (const [category, categoryTools] of Object.entries(toolsByCategory)) {
      lines.push(`### ${this.capitalize(category)} Tools`);
      lines.push('');
      
      for (const tool of categoryTools) {
        lines.push(`**${tool.name}**`);
        lines.push(`- ${tool.description}`);
        
        if (tool.parameters.length > 0) {
          lines.push('- Parameters:');
          for (const param of tool.parameters) {
            const required = param.required ? '(required)' : '(optional)';
            lines.push(`  - \`${param.name}\` ${required}: ${param.description}`);
          }
        }
        
        lines.push('');
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Build current task section
   */
  private buildTaskSection(task: Task): string {
    const lines: string[] = [];
    
    lines.push('## Current Task');
    lines.push('');
    lines.push(`**ID**: ${task.id}`);
    lines.push(`**Description**: ${task.description}`);
    lines.push(`**Priority**: ${task.priority}`);
    lines.push(`**Status**: ${task.status}`);
    
    if (task.dependencies && task.dependencies.length > 0) {
      lines.push(`**Dependencies**: ${task.dependencies.join(', ')}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Build history section
   */
  private buildHistorySection(history: any[]): string {
    const lines: string[] = [];
    
    lines.push('## Recent History');
    lines.push('');
    lines.push('Previous interactions in this session:');
    lines.push('');
    
    // Show last few history entries
    const recentEntries = history.slice(-5);
    
    for (const entry of recentEntries) {
      const roleLabel = entry.role.toUpperCase();
      lines.push(`**${roleLabel}**: ${entry.content}`);
      lines.push('');
    }
    
    return lines.join('\n');
  }

  /**
   * Build instructions section
   */
  private buildInstructions(): string {
    return `## Instructions

Please complete the current request using the available tools, working in phases.

**CRITICAL - Autonomous Mode**:
- DO NOT ask "What would you like to work on?" or similar questions
- DO NOT wait for user confirmation or input
- Analyze the task and IMMEDIATELY begin implementation
- Make reasonable assumptions and proceed with sensible defaults
- If something is ambiguous, choose the most common/standard approach

**Phase-Based Workflow**:

1. **Analyze** - Understand the current state and what needs to be done
2. **Plan Phase** - Define a small, manageable segment of work (15-30 min max)
3. **Execute Phase** - Use tools to complete just that segment
4. **Test Phase** - Verify the work when appropriate
5. **Commit Phase** - Commit if it's a logical unit of work
6. **Report Completion** - Clearly state what was accomplished
7. **Loop** - Plan the next phase if more work remains

**Remember**:
- Work incrementally - don't try to complete everything at once
- Each phase should be a committable unit of work
- Test after each phase when possible
- Explain your actions clearly as you work
- Mark phase completion explicitly
- Plan the next phase before starting it
- NEVER ask questions - just proceed with reasonable defaults

Work step by step in phases and use the tools to accomplish the task.`;
  }

  /**
   * Group tools by category
   */
  private groupToolsByCategory(tools: Tool[]): Record<string, Tool[]> {
    const grouped: Record<string, Tool[]> = {};
    
    for (const tool of tools) {
      const category = tool.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(tool);
    }
    
    return grouped;
  }

  /**
   * Capitalize first letter
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Build simple prompt without full context (for quick commands)
   */
  buildSimplePrompt(userPrompt: string): string {
    return userPrompt;
  }

  /**
   * Estimate prompt size in tokens (rough approximation)
   */
  estimatePromptSize(prompt: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(prompt.length / 4);
  }
}
