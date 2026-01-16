import { execSync } from 'child_process';
import { Tool, ToolResult, ToolContext } from '../utils/types.js';

/**
 * Git status tool
 */
export const gitStatusTool: Tool = {
  name: 'git_status',
  description: 'Get git repository status',
  category: 'git',
  parameters: [],
  async execute(params: Record<string, any>, context: ToolContext): Promise<ToolResult> {
    try {
      const output = execSync('git status', {
        cwd: context.workingDir,
        encoding: 'utf-8'
      });
      
      return {
        success: true,
        output: output.trim()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to get git status: ${errorMessage}`
      };
    }
  }
};

/**
 * Git commit tool
 */
export const gitCommitTool: Tool = {
  name: 'git_commit',
  description: 'Commit staged changes with a message',
  category: 'git',
  parameters: [
    {
      name: 'message',
      type: 'string',
      description: 'Commit message',
      required: true
    }
  ],
  async execute(params: Record<string, any>, context: ToolContext): Promise<ToolResult> {
    if (!params.message) {
      return {
        success: false,
        error: 'Commit message is required'
      };
    }

    try {
      const output = execSync(`git commit -m "${params.message.replace(/"/g, '\\"')}"`, {
        cwd: context.workingDir,
        encoding: 'utf-8'
      });
      
      return {
        success: true,
        output: output.trim()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to commit: ${errorMessage}`
      };
    }
  }
};

/**
 * Git diff tool
 */
export const gitDiffTool: Tool = {
  name: 'git_diff',
  description: 'Show diff of changes',
  category: 'git',
  parameters: [
    {
      name: 'staged',
      type: 'boolean',
      description: 'Show diff of staged changes (default: false)',
      required: false,
      default: false
    },
    {
      name: 'path',
      type: 'string',
      description: 'Specific file path to diff',
      required: false
    }
  ],
  async execute(params: Record<string, any>, context: ToolContext): Promise<ToolResult> {
    try {
      let command = 'git diff';
      
      if (params.staged) {
        command += ' --staged';
      }
      
      if (params.path) {
        command += ` -- "${params.path}"`;
      }
      
      const output = execSync(command, {
        cwd: context.workingDir,
        encoding: 'utf-8'
      });
      
      return {
        success: true,
        output: output.trim()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to get diff: ${errorMessage}`
      };
    }
  }
};

/**
 * All git tools
 */
export const gitTools: Tool[] = [
  gitStatusTool,
  gitCommitTool,
  gitDiffTool
];
