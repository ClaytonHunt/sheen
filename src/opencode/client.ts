import { spawn, ChildProcess } from 'child_process';
import { OpenCodeConfig, ConversationContext, OpenCodeResponse, ToolCall } from '../utils/types.js';
import { logger } from '../utils/logger.js';

/**
 * Client for interacting with OpenCode CLI
 */
export class OpenCodeClient {
  private config: OpenCodeConfig;
  private sessionActive: boolean = false;

  constructor(config: OpenCodeConfig) {
    this.config = config;
  }

  /**
   * Execute a prompt with OpenCode
   * @param prompt - The prompt to send
   * @param context - Conversation context
   * @param continueSession - Whether to continue existing session (default: true)
   * @returns OpenCode response
   */
  async execute(
    prompt: string,
    context: ConversationContext,
    continueSession: boolean = true
  ): Promise<OpenCodeResponse> {
    logger.debug('Executing OpenCode prompt', { prompt: prompt.substring(0, 100) });

    try {
      const output = await this.runOpenCode(prompt, continueSession);
      
      // Parse the output for tool calls and phase markers
      const response = this.parseResponse(output);
      
      this.sessionActive = true;
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`OpenCode execution failed: ${errorMessage}`);
      
      return {
        toolCalls: [],
        thinking: `Error: ${errorMessage}`,
        phaseComplete: false
      };
    }
  }

  /**
   * Run OpenCode CLI command
   */
  private async runOpenCode(prompt: string, continueSession: boolean): Promise<string> {
    return new Promise((resolve, reject) => {
      // Build command arguments
      const args = ['run'];
      
      // WORKAROUND: Disable --continue flag due to OpenCode bug with message type conversion
      // Error: AI_InvalidPromptError: The messages must be a ModelMessage[]
      // TODO: Re-enable when OpenCode fixes UIMessage[] -> ModelMessage[] conversion
      // if (continueSession) {
      //   args.push('--continue');
      // }
      
      args.push(prompt);
      
      logger.debug(`Running: opencode ${args.join(' ')}`);
      
      // Spawn OpenCode process
      const proc: ChildProcess = spawn('opencode', args, {
        cwd: process.cwd(),
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      // Collect stdout
      if (proc.stdout) {
        proc.stdout.on('data', (data: Buffer) => {
          const text = data.toString();
          stdout += text;
          
          // Stream output if enabled
          if (this.config.streamOutput) {
            process.stdout.write(text);
          }
        });
      }

      // Collect stderr
      if (proc.stderr) {
        proc.stderr.on('data', (data: Buffer) => {
          const text = data.toString();
          stderr += text;
          
          if (this.config.streamOutput) {
            process.stderr.write(text);
          }
        });
      }

      // Handle process exit
      proc.on('close', (code: number | null) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`OpenCode exited with code ${code}\n${stderr}`));
        }
      });

      // Handle process errors
      proc.on('error', (err: Error) => {
        reject(new Error(`Failed to spawn OpenCode: ${err.message}`));
      });
    });
  }

  /**
   * Parse OpenCode output into structured response
   */
  private parseResponse(output: string): OpenCodeResponse {
    const toolCalls: ToolCall[] = [];
    let thinking: string | undefined;
    let nextAction: string | undefined;
    let phaseComplete = false;
    let phaseMarker: string | undefined;

    // Check for phase completion markers
    const phasePatterns = [
      /DISCOVERY COMPLETE/i,
      /PLAN(?:NING)? COMPLETE/i,
      /IMPLEMENTATION COMPLETE/i,
      /VALIDATION COMPLETE/i
    ];

    for (const pattern of phasePatterns) {
      if (pattern.test(output)) {
        phaseComplete = true;
        const match = output.match(pattern);
        phaseMarker = match ? match[0] : undefined;
        break;
      }
    }

    // Try to extract any structured information
    // (In a real implementation, this would parse tool calls from OpenCode's output)
    // For now, we just capture the raw output
    thinking = output;

    return {
      toolCalls,
      thinking,
      nextAction,
      phaseComplete,
      phaseMarker
    };
  }

  /**
   * Check if OpenCode is available
   */
  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn('opencode', ['--version'], {
        shell: true,
        stdio: 'pipe'
      });

      proc.on('close', (code) => {
        resolve(code === 0);
      });

      proc.on('error', () => {
        resolve(false);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        proc.kill();
        resolve(false);
      }, 5000);
    });
  }

  /**
   * Reset session (start fresh conversation)
   */
  resetSession(): void {
    this.sessionActive = false;
    logger.debug('OpenCode session reset');
  }

  /**
   * Check if session is active
   */
  isSessionActive(): boolean {
    return this.sessionActive;
  }

  /**
   * Build context string for OpenCode
   */
  buildContextString(context: ConversationContext): string {
    const parts: string[] = [];

    // Project context
    parts.push('# Project Context');
    parts.push(`Type: ${context.projectContext.type}`);
    if (context.projectContext.framework) {
      parts.push(`Framework: ${context.projectContext.framework}`);
    }
    if (context.projectContext.language) {
      parts.push(`Language: ${context.projectContext.language}`);
    }
    parts.push('');

    // Current task
    if (context.currentTask) {
      parts.push('# Current Task');
      parts.push(`Description: ${context.currentTask.description}`);
      parts.push(`Priority: ${context.currentTask.priority}`);
      parts.push(`Phase: ${context.currentTask.phase}`);
      parts.push('');
    }

    // Available tools
    if (context.availableTools.length > 0) {
      parts.push('# Available Tools');
      for (const tool of context.availableTools) {
        parts.push(`- ${tool.name}: ${tool.description}`);
      }
      parts.push('');
    }

    // Recent history
    if (context.recentHistory.length > 0) {
      parts.push('# Recent History');
      for (const entry of context.recentHistory.slice(-5)) {
        parts.push(`[${entry.role}] ${entry.content.substring(0, 100)}...`);
      }
      parts.push('');
    }

    return parts.join('\n');
  }
}
