import { AgentConfig, ProjectContext, ExecutionState, Phase, UserMessage } from '../utils/types.js';
import { OpenCodeClient } from '../opencode/client.js';
import { ToolCallAdapter } from '../opencode/adapter.js';
import { ToolRegistry } from '../tools/registry.js';
import { fileTools } from '../tools/file.js';
import { logger } from '../utils/logger.js';

/**
 * Main agent orchestrator
 * 
 * Coordinates OpenCode execution, tool calls, and task management.
 * This is a minimal MVP implementation focusing on basic prompt execution.
 */
export class Agent {
  private opencode: OpenCodeClient;
  private adapter: ToolCallAdapter;
  private toolRegistry: ToolRegistry;
  private state: ExecutionState;
  private running: boolean = false;

  constructor(
    private config: AgentConfig,
    private projectContext: ProjectContext
  ) {
    // Initialize components
    this.toolRegistry = new ToolRegistry();
    this.toolRegistry.registerAll(fileTools);
    
    this.opencode = new OpenCodeClient(config.opencode);
    this.adapter = new ToolCallAdapter(this.toolRegistry, projectContext);

    // Initialize execution state
    this.state = {
      iteration: 0,
      phase: 'implementation' as Phase,
      phaseIteration: 0,
      tasks: [],
      metrics: {
        testCount: 0,
        fileCount: 0,
        commitCount: 0,
        noProgressCount: 0
      },
      errors: [],
      startedAt: new Date(),
      lastActivityAt: new Date(),
      paused: false,
      userMessages: [],
      projectContext
    };
  }

  /**
   * Run agent with initial prompt
   */
  async run(initialPrompt?: string): Promise<ExecutionState> {
    if (!initialPrompt) {
      throw new Error('Initial prompt is required');
    }

    this.running = true;
    logger.info('Agent starting execution');
    logger.info(`Prompt: ${initialPrompt}`);

    try {
      // Simple single-iteration execution for MVP
      await this.executeIteration(initialPrompt);
      
      logger.info('Agent execution complete');
      return this.state;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Agent execution failed: ${errorMessage}`);
      
      this.state.errors.push({
        iteration: this.state.iteration,
        phase: this.state.phase,
        error: error as Error,
        recovered: false,
        timestamp: new Date()
      });
      
      throw error;
    } finally {
      this.running = false;
    }
  }

  /**
   * Execute a single iteration
   */
  private async executeIteration(prompt: string): Promise<void> {
    this.state.iteration++;
    this.state.lastActivityAt = new Date();
    
    logger.info(`Iteration ${this.state.iteration}: Executing OpenCode`);

    // Build conversation context
    const context = {
      projectContext: this.projectContext,
      currentTask: this.state.currentTask,
      recentHistory: [],
      availableTools: this.toolRegistry.getAll()
    };

    // Execute OpenCode with prompt
    const response = await this.opencode.execute(prompt, context);
    
    // Log thinking/output
    if (response.thinking) {
      logger.info('OpenCode response received');
      if (this.config.logLevel === 'debug') {
        logger.debug('OpenCode output:', { output: response.thinking });
      }
    }

    // Check for phase completion
    if (response.phaseComplete && response.phaseMarker) {
      logger.info(`Phase marker detected: ${response.phaseMarker}`);
    }

    // Parse tool calls from output
    if (response.thinking) {
      const toolCalls = this.adapter.parseToolCalls(response.thinking);
      
      if (toolCalls.length > 0) {
        logger.info(`Found ${toolCalls.length} tool call(s) to execute`);
        
        // Execute tool calls
        const toolContext = {
          workingDir: this.projectContext.rootDir,
          config: this.config,
          projectContext: this.projectContext
        };
        
        const results = await this.adapter.executeToolCalls(toolCalls, toolContext);
        
        // Log summary
        const summary = this.adapter.summarizeExecution(results);
        logger.info(`Tool execution: ${summary}`);
        
        // Update metrics
        const filesChanged = new Set<string>();
        for (const result of results) {
          if (result.result.filesChanged) {
            result.result.filesChanged.forEach(f => filesChanged.add(f));
          }
        }
        this.state.metrics.fileCount += filesChanged.size;
      } else {
        logger.info('No tool calls found in output');
      }
    }
  }

  /**
   * Pause execution
   */
  async pause(): Promise<void> {
    this.state.paused = true;
    logger.info('Agent paused');
  }

  /**
   * Resume execution
   */
  async resume(): Promise<void> {
    this.state.paused = false;
    logger.info('Agent resumed');
  }

  /**
   * Stop execution
   */
  async stop(): Promise<void> {
    this.running = false;
    logger.info('Agent stopped');
  }

  /**
   * Get current execution state
   */
  getState(): ExecutionState {
    return { ...this.state };
  }

  /**
   * Queue user message for processing
   */
  queueUserMessage(message: string): void {
    const userMessage: UserMessage = {
      message,
      timestamp: new Date(),
      processed: false
    };
    
    this.state.userMessages.push(userMessage);
    logger.info(`User message queued: ${message}`);
  }

  /**
   * Get available tools
   */
  getTools() {
    return this.toolRegistry.getAll();
  }

  /**
   * Check if agent is running
   */
  isRunning(): boolean {
    return this.running;
  }
}
