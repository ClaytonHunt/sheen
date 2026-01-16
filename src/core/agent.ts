import { AgentConfig, ProjectContext, ExecutionState, Phase, UserMessage } from '../utils/types.js';
import { OpenCodeClient } from '../opencode/client.js';
import { ToolCallAdapter } from '../opencode/adapter.js';
import { ToolRegistry } from '../tools/registry.js';
import { fileTools } from '../tools/file.js';
import { gitTools } from '../tools/git.js';
import { shellTools } from '../tools/shell.js';
import { logger } from '../utils/logger.js';
import { ExecutionLoop } from './loop.js';
import { TaskPlanner } from './planner.js';
import { ContextManager } from './context.js';
import { PromptBuilder } from '../io/prompt.js';

/**
 * Main agent orchestrator
 * 
 * Coordinates OpenCode execution, tool calls, and task management.
 */
export class Agent {
  private opencode: OpenCodeClient;
  private adapter: ToolCallAdapter;
  private toolRegistry: ToolRegistry;
  private executionLoop: ExecutionLoop;
  private planner: TaskPlanner;
  private contextManager: ContextManager;
  private promptBuilder: PromptBuilder;
  private state: ExecutionState;
  private running: boolean = false;

  constructor(
    private config: AgentConfig,
    private projectContext: ProjectContext
  ) {
    // Initialize components
    this.toolRegistry = new ToolRegistry();
    this.toolRegistry.registerAll(fileTools);
    this.toolRegistry.registerAll(gitTools);
    this.toolRegistry.registerAll(shellTools);
    
    this.opencode = new OpenCodeClient(config.opencode);
    this.adapter = new ToolCallAdapter(this.toolRegistry, projectContext);
    this.executionLoop = new ExecutionLoop(config);
    this.planner = new TaskPlanner(projectContext);
    this.contextManager = new ContextManager(projectContext);
    this.promptBuilder = new PromptBuilder();

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
      // Create initial plan from prompt
      this.state.tasks = await this.planner.createPlan(initialPrompt);
      
      // Add user prompt to history
      this.contextManager.addUserMessage(initialPrompt);
      
      // Execute main loop
      await this.executionLoop.execute(
        this.state,
        this.planner,
        this.contextManager,
        this.promptBuilder,
        this.opencode,
        this.adapter,
        this.toolRegistry
      );
      
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
