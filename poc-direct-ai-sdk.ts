/**
 * Proof of Concept: Direct Vercel AI SDK Integration
 * 
 * This demonstrates how Sheen would work with direct AI SDK usage
 * instead of calling OpenCode as a subprocess.
 */

import { anthropic } from '@ai-sdk/anthropic';
import { streamText, tool, CoreMessage } from 'ai';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

// ===== TOOL DEFINITIONS =====
// These mirror OpenCode's tools but use AI SDK's native format

const sheenTools = {
  bash: tool({
    description: 'Execute shell commands in the project directory',
    parameters: z.object({
      command: z.string().describe('Shell command to execute'),
      description: z.string().optional().describe('What this command does'),
    }),
    execute: async ({ command, description }) => {
      console.log(`[TOOL:bash] ${description || command}`);
      try {
        const { stdout, stderr } = await execAsync(command, {
          cwd: process.cwd(),
          timeout: 120000,
        });
        return { 
          success: true, 
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message,
          stdout: error.stdout?.trim() || '',
          stderr: error.stderr?.trim() || '',
        };
      }
    },
  }),

  read: tool({
    description: 'Read file contents from the codebase',
    parameters: z.object({
      filePath: z.string().describe('Absolute path to the file'),
      offset: z.number().optional().describe('Line number to start from (0-indexed)'),
      limit: z.number().optional().describe('Number of lines to read'),
    }),
    execute: async ({ filePath, offset = 0, limit = 2000 }) => {
      console.log(`[TOOL:read] ${filePath}${offset ? ` (from line ${offset})` : ''}`);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');
        const selectedLines = lines.slice(offset, offset + limit);
        
        // Format with line numbers (like cat -n)
        const formatted = selectedLines
          .map((line, idx) => `${String(offset + idx + 1).padStart(5, '0')}| ${line}`)
          .join('\n');
        
        return { 
          success: true, 
          content: formatted,
          totalLines: lines.length,
          displayedLines: selectedLines.length,
        };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message,
        };
      }
    },
  }),

  write: tool({
    description: 'Write content to a file (creates or overwrites)',
    parameters: z.object({
      filePath: z.string().describe('Absolute path to the file'),
      content: z.string().describe('Content to write'),
    }),
    execute: async ({ filePath, content }) => {
      console.log(`[TOOL:write] ${filePath} (${content.length} bytes)`);
      try {
        await fs.writeFile(filePath, content, 'utf-8');
        return { 
          success: true,
          bytesWritten: content.length,
          filePath,
        };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message,
        };
      }
    },
  }),

  edit: tool({
    description: 'Edit a file by replacing exact string matches',
    parameters: z.object({
      filePath: z.string().describe('Absolute path to the file'),
      oldString: z.string().describe('Exact string to replace'),
      newString: z.string().describe('String to replace it with'),
      replaceAll: z.boolean().optional().describe('Replace all occurrences'),
    }),
    execute: async ({ filePath, oldString, newString, replaceAll = false }) => {
      console.log(`[TOOL:edit] ${filePath}`);
      try {
        let content = await fs.readFile(filePath, 'utf-8');
        
        // Count occurrences
        const occurrences = (content.match(new RegExp(escapeRegex(oldString), 'g')) || []).length;
        
        if (occurrences === 0) {
          return {
            success: false,
            error: 'oldString not found in content',
          };
        }
        
        if (occurrences > 1 && !replaceAll) {
          return {
            success: false,
            error: `oldString found ${occurrences} times. Use replaceAll: true to replace all occurrences.`,
          };
        }
        
        // Perform replacement
        const newContent = replaceAll 
          ? content.replaceAll(oldString, newString)
          : content.replace(oldString, newString);
        
        await fs.writeFile(filePath, newContent, 'utf-8');
        
        return {
          success: true,
          replacements: replaceAll ? occurrences : 1,
          filePath,
        };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message,
        };
      }
    },
  }),

  todowrite: tool({
    description: 'Create or update todo list for tracking complex tasks',
    parameters: z.object({
      todos: z.array(z.object({
        id: z.string(),
        content: z.string(),
        status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
        priority: z.enum(['high', 'medium', 'low']),
      })),
    }),
    execute: async ({ todos }) => {
      console.log(`[TOOL:todowrite] ${todos.length} todos`);
      // Store in memory or file
      return { 
        success: true,
        todos,
      };
    },
  }),
};

// Helper function
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ===== AUTONOMOUS AGENT =====

interface AgentConfig {
  model: string;
  maxSteps: number;
  systemPrompt: string;
}

export class SheenAutonomousAgent {
  private messages: CoreMessage[] = [];
  private config: AgentConfig;

  constructor(config: Partial<AgentConfig> = {}) {
    this.config = {
      model: 'claude-3-5-sonnet-20241022',
      maxSteps: 20,
      systemPrompt: `You are Sheen, an autonomous coding agent. Your goal is to complete tasks independently by:

1. Reading and understanding the codebase
2. Planning your approach
3. Making incremental changes
4. Testing your changes
5. Committing when logical units are complete

You have access to these tools:
- bash: Execute shell commands (git, npm, tests, etc.)
- read: Read file contents
- write: Create new files
- edit: Modify existing files precisely
- todowrite: Track complex multi-step tasks

Be methodical, test frequently, and commit often with clear messages.`,
      ...config,
    };
  }

  async execute(userTask: string): Promise<void> {
    console.log('🤖 Sheen Autonomous Agent Starting...\n');
    console.log(`📋 Task: ${userTask}\n`);

    // Initialize conversation
    this.messages = [
      {
        role: 'system',
        content: this.config.systemPrompt,
      },
      {
        role: 'user',
        content: userTask,
      },
    ];

    try {
      const result = await streamText({
        model: anthropic(this.config.model),
        messages: this.messages,
        tools: sheenTools,
        maxSteps: this.config.maxSteps,
        
        onStepFinish: (step) => {
          console.log(`\n[STEP ${step.stepType}]`);
          
          if (step.toolCalls && step.toolCalls.length > 0) {
            console.log(`  Tool calls: ${step.toolCalls.length}`);
          }
          
          if (step.text) {
            console.log(`  Response: ${step.text.substring(0, 100)}...`);
          }
        },
      });

      console.log('\n📝 Agent Response:\n');
      
      // Stream the final response
      for await (const chunk of result.textStream) {
        process.stdout.write(chunk);
      }

      console.log('\n\n✅ Task Complete!');
      
      // Get usage stats
      const usage = await result.usage;
      console.log(`\n📊 Token Usage: ${usage.totalTokens} total (${usage.promptTokens} prompt + ${usage.completionTokens} completion)`);

    } catch (error) {
      console.error('\n❌ Error:', error);
      throw error;
    }
  }

  // For multi-turn conversations
  async continueConversation(message: string): Promise<void> {
    this.messages.push({
      role: 'user',
      content: message,
    });

    await this.execute(message);
  }
}

// ===== USAGE EXAMPLE =====

async function main() {
  const agent = new SheenAutonomousAgent({
    maxSteps: 15,
  });

  // Example task
  await agent.execute(`
    Create a simple TODO list CLI application in TypeScript:
    
    1. Create src/todo.ts with a Todo type and functions to add/list/complete todos
    2. Create src/cli.ts that uses commander.js for the CLI
    3. Add proper TypeScript types
    4. Test that it compiles
    
    Be methodical and test after each step.
  `);
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export default SheenAutonomousAgent;
