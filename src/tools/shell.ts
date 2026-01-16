import { execSync } from 'child_process';
import { Tool, ToolResult, ToolContext } from '../utils/types.js';

/**
 * Shell execution tool
 */
export const shellExecTool: Tool = {
  name: 'shell_exec',
  description: 'Execute a shell command',
  category: 'shell',
  parameters: [
    {
      name: 'command',
      type: 'string',
      description: 'Shell command to execute',
      required: true
    }
  ],
  async execute(params: Record<string, any>, context: ToolContext): Promise<ToolResult> {
    if (!params.command) {
      return {
        success: false,
        error: 'Command is required'
      };
    }

    try {
      const output = execSync(params.command, {
        cwd: context.workingDir,
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      
      return {
        success: true,
        output: output.trim(),
        exitCode: 0
      };
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      const exitCode = error.status || 1;
      
      return {
        success: false,
        error: `Command failed with exit code ${exitCode}: ${errorMessage}`,
        exitCode
      };
    }
  }
};

/**
 * All shell tools
 */
export const shellTools: Tool[] = [
  shellExecTool
];
