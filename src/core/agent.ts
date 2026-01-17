import { AgentConfig, ProjectContext, ExecutionState, Phase, UserMessage, Task, TaskStatus, TaskPriority } from '../utils/types.js';
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
import { AIAgent } from '../ai/agent-interface.js';
import { OpenCodeAdapter } from '../ai/opencode-adapter.js';
import { DirectAIAgent } from '../ai/direct-ai-agent.js';
import { createProvider } from '../ai/provider-factory.js';
import { allTools } from '../tools/ai-sdk/index.js';

/**
 * Main agent orchestrator
 * 
 * Coordinates AI agent execution (OpenCode or DirectAIAgent), tool calls, and task management.
 */
export class Agent {
  private aiAgent?: AIAgent;
  private opencode?: OpenCodeClient;
  private adapter?: ToolCallAdapter;
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
    // Initialize tool registry (used for OpenCode path)
    this.toolRegistry = new ToolRegistry();
    this.toolRegistry.registerAll(fileTools);
    this.toolRegistry.registerAll(gitTools);
    this.toolRegistry.registerAll(shellTools);
    
    // Initialize AI agent based on configuration
    const useAISDK = config.ai?.engine === 'direct-ai-sdk';
    
    if (useAISDK && config.ai) {
      logger.info(`Initializing DirectAIAgent with provider: ${config.ai.provider}`);
      
      // Create provider
      const provider = createProvider(config.ai);
      
      // Create DirectAIAgent
      this.aiAgent = new DirectAIAgent(provider, config.ai, config.ai.provider);
      
      // Register AI SDK tools - convert allTools object to ToolDefinition array
      const toolDefinitions = Object.entries(allTools).map(([name, tool]) => ({
        name,
        description: '', // Tools already have descriptions in their definitions
        tool
      }));
      this.aiAgent.registerTools(toolDefinitions);
      
      logger.info('DirectAIAgent initialized successfully');
    } else {
      logger.info('Initializing OpenCodeAdapter for backward compatibility');
      
      // Create OpenCode client
      this.opencode = new OpenCodeClient(config.opencode);
      
      // Wrap in adapter for AIAgent interface
      this.aiAgent = new OpenCodeAdapter(this.opencode);
      
      // Create tool call adapter (for legacy path)
      this.adapter = new ToolCallAdapter(this.toolRegistry, projectContext);
      
      logger.info('OpenCodeAdapter initialized successfully');
    }
    
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
   * Run agent with initial prompt or in auto mode
   * @param initialPrompt - Optional prompt. If not provided, loads existing plan
   */
  async run(initialPrompt?: string): Promise<ExecutionState> {
    this.running = true;
    logger.info('Agent starting execution');

    try {
      if (initialPrompt) {
        // When a prompt is provided, first check if a plan already exists
        logger.info(`Prompt: ${initialPrompt}`);
        
        const planExists = await this.planner.planExists();
        
        if (planExists) {
          // Load existing plan
          logger.info('Loading existing plan...');
          await this.planner.loadPlan();
          
          // Create discovery/planning/implementation tasks from new prompt
          logger.info('Creating discovery, planning, and implementation tasks from prompt...');
          const newTasks = await this.createDiscoveryPlanningTasks(initialPrompt);
          
          // Prepend new tasks to the top of the existing plan
          logger.info('Prepending new tasks to top of existing plan...');
          this.state.tasks = await this.planner.prependTasks(newTasks);
          
          // Get all tasks (new ones are now at the top)
          this.state.tasks = this.planner.getTasks();
        } else {
          // No existing plan, create new plan with discovery/planning/implementation
          logger.info('Creating new plan with discovery, planning, and implementation phases...');
          this.state.tasks = await this.planner.createPlan(initialPrompt);
        }
        
        // Add user prompt to history
        this.contextManager.addUserMessage(initialPrompt);
      } else {
        // Auto mode: Load existing plan
        logger.info('Running in auto mode (loading existing plan)');
        this.state.tasks = await this.planner.loadPlan();
        
        if (this.state.tasks.length === 0) {
          logger.warn('No tasks found in plan');
          return this.state;
        }
      }
      
      // Execute main loop with appropriate engine
      const useAISDK = this.config.ai?.engine === 'direct-ai-sdk';
      
      if (useAISDK && this.aiAgent) {
        logger.info('Executing with DirectAIAgent');
        await this.executionLoop.executeWithAIAgent(
          this.state,
          this.aiAgent,
          this.planner,
          this.contextManager
        );
      } else if (this.opencode && this.adapter) {
        logger.info('Executing with OpenCode (legacy)');
        await this.executionLoop.execute(
          this.state,
          this.planner,
          this.contextManager,
          this.promptBuilder,
          this.opencode,
          this.adapter,
          this.toolRegistry
        );
      } else {
        throw new Error('No execution engine initialized');
      }
      
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
   * Create discovery, planning, and implementation tasks for a prompt
   */
  private createDiscoveryPlanningTasks(prompt: string): Omit<Task, 'id' | 'createdAt'>[] {
    return [
      {
        description: `Discovery: Analyze requirements and codebase for: ${prompt}`,
        status: 'pending' as TaskStatus,
        priority: 'high' as TaskPriority,
        phase: 'discovery' as Phase,
        attempts: 0
      },
      {
        description: `Planning: Create detailed implementation plan for: ${prompt}`,
        status: 'pending' as TaskStatus,
        priority: 'high' as TaskPriority,
        phase: 'planning' as Phase,
        attempts: 0
      },
      {
        description: `Implementation: ${prompt}`,
        status: 'pending' as TaskStatus,
        priority: 'high' as TaskPriority,
        phase: 'implementation' as Phase,
        attempts: 0
      }
    ];
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

  /**
   * Get task planner (for loading existing plans)
   */
  getPlanner(): TaskPlanner {
    return this.planner;
  }
}
