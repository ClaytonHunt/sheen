/**
 * Git Tools - AI SDK Format
 * 
 * Git operations for source control management.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { ToolContext } from './types.js';

const execAsync = promisify(exec);

/**
 * Git status tool - Show repository status
 */
export const gitStatusTool = tool({
  description: 'Get git repository status (shows untracked files, modifications, staged changes)',
  parameters: z.object({}),
  
  // @ts-expect-error - AI SDK v6 tool types have compatibility issues with TypeScript strict mode
  execute: async ({}, context: ToolContext) => {
    try {
      const { stdout, stderr } = await execAsync('git status', {
        cwd: context.workingDirectory,
        timeout: 10000
      });
      
      return {
        success: true,
        status: stdout.trim(),
        hasChanges: !stdout.includes('nothing to commit, working tree clean')
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});

/**
 * Git diff tool - Show changes
 */
export const gitDiffTool = tool({
  description: 'Show diff of changes (unstaged or staged changes)',
  parameters: z.object({
    staged: z.boolean().optional().describe('Show diff of staged changes instead of unstaged (default: false)'),
    path: z.string().optional().describe('Specific file path to diff')
  }),
  
  // @ts-expect-error - AI SDK v6 tool types have compatibility issues with TypeScript strict mode
  execute: async ({ staged = false, path }: {
    staged?: boolean;
    path?: string;
  }, context: ToolContext) => {
    try {
      let command = 'git diff';
      
      if (staged) {
        command += ' --staged';
      }
      
      if (path) {
        command += ` -- "${path.replace(/"/g, '\\"')}"`;
      }
      
      const { stdout, stderr } = await execAsync(command, {
        cwd: context.workingDirectory,
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024
      });
      
      if (!stdout.trim()) {
        return {
          success: true,
          message: staged ? 'No staged changes' : 'No unstaged changes',
          diff: ''
        };
      }
      
      // Truncate very large diffs
      const truncateAt = 50000;
      const diff = stdout.length > truncateAt 
        ? stdout.substring(0, truncateAt) + '\n\n[... diff truncated, showing first 50KB ...]'
        : stdout;
      
      return {
        success: true,
        diff: diff.trim()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});

/**
 * Git commit tool - Commit staged changes
 */
export const gitCommitTool = tool({
  description: 'Commit staged changes with a message. IMPORTANT: Stage files with "git add" first using the bash tool.',
  parameters: z.object({
    message: z.string().describe('Commit message (required, should be descriptive)')
  }),
  
  // @ts-expect-error - AI SDK v6 tool types have compatibility issues with TypeScript strict mode
  execute: async ({ message }: { message: string }, context: ToolContext) => {
    if (!message || message.trim().length === 0) {
      return {
        success: false,
        error: 'Commit message is required and cannot be empty'
      };
    }
    
    try {
      // Escape message for shell
      const escapedMessage = message.replace(/"/g, '\\"');
      
      const { stdout, stderr } = await execAsync(`git commit -m "${escapedMessage}"`, {
        cwd: context.workingDirectory,
        timeout: 30000
      });
      
      return {
        success: true,
        output: stdout.trim() || stderr.trim(),
        message: `Commit created: ${message}`
      };
    } catch (error: any) {
      // Check if error is due to no changes staged
      if (error.message && error.message.includes('nothing to commit')) {
        return {
          success: false,
          error: 'No changes staged for commit. Use "git add" to stage files first.'
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});
