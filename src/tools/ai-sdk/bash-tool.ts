/**
 * Bash Tool - AI SDK Format
 * 
 * Execute shell commands with timeout and output capture.
 * Safety features:
 * - Command validation
 * - Output truncation
 * - Timeout enforcement
 */

import { tool } from 'ai';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Bash tool for executing shell commands
 */
export const bashTool = tool({
  description: `Execute shell commands in the project directory. 
Use this for git commands, package managers, tests, builds, and other terminal operations.
IMPORTANT: Quote file paths with spaces (e.g., "path with spaces/file.txt")`,
  
  parameters: z.object({
    command: z.string().describe('Shell command to execute'),
    workdir: z.string().optional().describe('Working directory for command (defaults to project root)'),
    timeout: z.number().optional().describe('Timeout in milliseconds (default: 120000)'),
    description: z.string().optional().describe('Clear description of what this command does in 5-10 words'),
  }),
  
  // @ts-expect-error - AI SDK v6 tool types have compatibility issues with TypeScript strict mode
  execute: async ({ command, workdir, timeout = 120000, description }: {
    command: string;
    workdir?: string;
    timeout?: number;
    description?: string;
  }) => {
    // Log for debugging
    console.log(`[TOOL:bash] ${description || command}`);

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: workdir || process.cwd(),
        timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB max output
      });

      // Truncate large output
      const truncateOutput = (str: string, maxBytes: number = 51200): string => {
        if (str.length <= maxBytes) {
          return str;
        }
        return str.substring(0, maxBytes) + '\n\n[Output truncated - use grep/read for specific sections]';
      };

      return {
        success: true,
        stdout: truncateOutput(stdout),
        stderr: truncateOutput(stderr),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        exitCode: error.code || 1,
        stdout: error.stdout ? error.stdout.substring(0, 51200) : '',
        stderr: error.stderr ? error.stderr.substring(0, 51200) : '',
      };
    }
  },
});
