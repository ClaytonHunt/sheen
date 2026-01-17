import { AgentConfig, ExecutionState, ProgressMetrics, ToolContext } from '../utils/types.js';
import { logger } from '../utils/logger.js';
import { TaskPlanner } from './planner.js';
import { ContextManager } from './context.js';
import { PromptBuilder } from '../io/prompt.js';
import { OpenCodeClient } from '../opencode/client.js';
import { ToolCallAdapter } from '../opencode/adapter.js';
import { ToolRegistry } from '../tools/registry.js';
import { AIAgent } from '../ai/agent-interface.js';

/**
 * Execution loop for autonomous agent iterations
 * Supports both OpenCode and DirectAIAgent engines
 */
export class ExecutionLoop {
  constructor(private config: AgentConfig) {}

  /**
   * Execute main autonomous loop with AIAgent (v0.2.0)
   * 
   * @param state - Current execution state
   * @param agent - AI agent instance (OpenCodeAdapter or DirectAIAgent)
   * @param planner - Task planner instance
   * @param contextManager - Context manager instance
   */
  async executeWithAIAgent(
    state: ExecutionState,
    agent: AIAgent,
    planner: TaskPlanner,
    contextManager: ContextManager
  ): Promise<void> {
    logger.info('Starting execution loop with AIAgent');
    
    while (this.shouldContinue(state)) {
      try {
        // Save previous metrics for progress detection
        const prevMetrics = { ...state.metrics };
        
        // Increment iteration
        this.incrementIteration(state);
        
        // Get next task (or current task if in progress)
        let task = state.currentTask;
        if (!task) {
          const nextTask = await planner.getNextTask(state);
          if (!nextTask) {
            logger.info('No more tasks to execute');
            state.phase = 'complete';
            break;
          }
          
          task = nextTask;
          
          // Mark task as in progress
          await planner.updateTask(task.id, { 
            status: 'in_progress',
            startedAt: new Date()
          });
          state.currentTask = task;
          logger.phase(`Starting task: ${task.description}`);
        }
        
        // Build agent context
        const agentContext = {
          projectContext: state.projectContext,
          executionState: state,
          configuration: this.config,
          conversationHistory: contextManager.getHistory()
        };
        
        // Execute with agent
        logger.debug(`Executing with AIAgent (iteration ${state.iteration})`);
        const result = await agent.execute(task.description, agentContext);
        
        // Process result
        if (result.success) {
          logger.success('Task execution successful');
          
          // Update context with tool results
          if (result.toolCalls && result.toolCalls.length > 0) {
            logger.info(`Executed ${result.toolCalls.length} tool call(s)`);
            
            // Note: File change tracking will be handled by the tools themselves
            // We could track this through metadata if needed in the future
          }
          
          // Check if task should be marked complete
          // For now, mark complete if the response indicates completion
          if (result.response && 
              (result.response.includes('IMPLEMENTATION COMPLETE') || 
               result.response.includes('Task complete'))) {
            if (state.currentTask) {
              await planner.updateTask(state.currentTask.id, { 
                status: 'completed',
                completedAt: new Date()
              });
              state.currentTask = undefined;
            }
            
            // Check if there are more tasks
            const nextTask = await planner.getNextTask(state);
            if (!nextTask) {
              state.phase = 'complete';
              break;
            }
          }
        } else {
          logger.warn('Task execution failed');
          
          // Mark task as failed
          if (state.currentTask) {
            await planner.updateTask(state.currentTask.id, { 
              status: 'failed'
            });
            state.currentTask = undefined;
          }
        }
        
        // Update progress tracking
        this.updateProgress(state, prevMetrics);
        
        // Sleep between iterations
        await this.sleep();
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Iteration ${state.iteration} failed: ${errorMessage}`);
        
        // Record error
        state.errors.push({
          iteration: state.iteration,
          phase: state.phase,
          error: error as Error,
          recovered: false,
          timestamp: new Date()
        });
        
        // Mark current task as failed if we have one
        if (state.currentTask) {
          await planner.updateTask(state.currentTask.id, { 
            status: 'failed'
          });
          state.currentTask = undefined;
        }
        
        // Check if we should continue or stop
        const recentErrors = state.errors.filter(e => !e.recovered).length;
        if (recentErrors >= this.config.errorRecovery.maxOpenCodeErrors) {
          logger.error('Too many errors, stopping execution');
          break;
        }
      }
    }
    
    logger.success('Execution loop finished');
    logger.info(`Completed ${state.iteration} iteration(s)`);
  }

  /**
   * Execute main autonomous loop (Legacy OpenCode path for backward compatibility)
   * 
   * @param state - Current execution state
   * @param planner - Task planner instance
   * @param contextManager - Context manager instance
   * @param promptBuilder - Prompt builder instance
   * @param opencode - OpenCode client instance
   * @param adapter - Tool call adapter instance
   * @param toolRegistry - Tool registry instance
   */
  async execute(
    state: ExecutionState,
    planner: TaskPlanner,
    contextManager: ContextManager,
    promptBuilder: PromptBuilder,
    opencode: OpenCodeClient,
    adapter: ToolCallAdapter,
    toolRegistry: ToolRegistry
  ): Promise<void> {
    logger.info('Starting execution loop');
    
    while (this.shouldContinue(state)) {
      try {
        // Save previous metrics for progress detection
        const prevMetrics = { ...state.metrics };
        
        // Increment iteration
        this.incrementIteration(state);
        
        // Get next task (or current task if in progress)
        let task = state.currentTask;
        if (!task) {
          const nextTask = await planner.getNextTask(state);
          if (!nextTask) {
            logger.info('No more tasks to execute');
            state.phase = 'complete';
            break;
          }
          
          task = nextTask;
          
          // Mark task as in progress
          await planner.updateTask(task.id, { 
            status: 'in_progress',
            startedAt: new Date()
          });
          state.currentTask = task;
          logger.phase(`Starting task: ${task.description}`);
        }
        
        // Build conversation context
        const context = contextManager.buildContext(
          task,
          toolRegistry.getAll(),
          state
        );
        
        // Build prompt with system instructions
        const prompt = promptBuilder.buildPrompt(
          task.description,
          context
        );
        
        // Execute OpenCode with prompt
        logger.debug(`Executing OpenCode (iteration ${state.iteration})`);
        const response = await opencode.execute(prompt, context);
        
        // Add assistant response to history
        if (response.thinking) {
          contextManager.addAssistantMessage(response.thinking);
        }
        
        // Check for phase completion
        if (response.phaseComplete && response.phaseMarker) {
          logger.info(`Phase marker detected: ${response.phaseMarker}`);
          
          // Mark current task as complete
          if (state.currentTask) {
            await planner.updateTask(state.currentTask.id, { 
              status: 'completed',
              completedAt: new Date()
            });
            state.currentTask = undefined;
          }
          
          // Check if there are more tasks to process
          const nextTask = await planner.getNextTask(state);
          if (!nextTask) {
            // No more tasks, update phase to complete
            state.phase = 'complete';
            break;
          }
          // Continue to next task
        }
        
        // Parse and execute tool calls
        if (response.thinking) {
          const toolCalls = adapter.parseToolCalls(response.thinking);
          
          if (toolCalls.length > 0) {
            logger.info(`Executing ${toolCalls.length} tool call(s)`);
            
            // Build tool context
            const toolContext: ToolContext = {
              workingDir: state.projectContext.rootDir,
              config: this.config,
              projectContext: state.projectContext
            };
            
            // Execute tool calls
            const results = await adapter.executeToolCalls(toolCalls, toolContext);
            
            // Add tool results to history
            for (const result of results) {
              contextManager.addToolResult(result.toolCall.tool, result.result);
            }
            
            // Update metrics
            const filesChanged = new Set<string>();
            for (const result of results) {
              if (result.result.filesChanged) {
                result.result.filesChanged.forEach(f => filesChanged.add(f));
              }
            }
            
            if (filesChanged.size > 0) {
              state.metrics.fileCount += filesChanged.size;
              logger.debug(`Modified ${filesChanged.size} file(s)`);
            }
            
            // Log execution summary
            const summary = adapter.summarizeExecution(results);
            logger.info(`Tool execution: ${summary}`);
          } else {
            logger.debug('No tool calls found in response');
          }
        }
        
        // Check if task is complete (don't auto-complete after one iteration)
        // Wait for OpenCode to signal completion via phase markers
        // This allows discovery and planning phases to run multiple iterations if needed
        
        // Update progress tracking
        this.updateProgress(state, prevMetrics);
        
        // Sleep between iterations
        await this.sleep();
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Iteration ${state.iteration} failed: ${errorMessage}`);
        
        // Record error
        state.errors.push({
          iteration: state.iteration,
          phase: state.phase,
          error: error as Error,
          recovered: false,
          timestamp: new Date()
        });
        
        // Mark current task as failed if we have one
        if (state.currentTask) {
          await planner.updateTask(state.currentTask.id, { 
            status: 'failed'
          });
          state.currentTask = undefined;
        }
        
        // Check if we should continue or stop
        const recentErrors = state.errors.filter(e => !e.recovered).length;
        if (recentErrors >= this.config.errorRecovery.maxOpenCodeErrors) {
          logger.error('Too many errors, stopping execution');
          break;
        }
      }
    }
    
    logger.success('Execution loop finished');
    logger.info(`Completed ${state.iteration} iteration(s)`);
  }

  /**
   * Check if execution should continue
   */
  shouldContinue(state: ExecutionState): boolean {
    // Check if paused
    if (state.paused) {
      logger.debug('Execution paused');
      return false;
    }

    // Check if phase is complete
    if (state.phase === 'complete') {
      logger.info('Phase complete');
      return false;
    }

    // Check max iterations
    if (state.iteration >= this.config.maxIterations) {
      logger.warn(`Max iterations (${this.config.maxIterations}) reached`);
      return false;
    }

    // Check for too many errors
    const recentErrors = state.errors.filter(e => !e.recovered).length;
    if (recentErrors >= this.config.errorRecovery.maxOpenCodeErrors) {
      logger.error(`Too many errors (${recentErrors}), stopping`);
      return false;
    }

    // Check for no progress
    if (state.metrics.noProgressCount >= this.config.errorRecovery.maxNoProgress) {
      logger.warn(`No progress for ${state.metrics.noProgressCount} iterations, stopping`);
      return false;
    }

    return true;
  }

  /**
   * Increment iteration counter
   */
  incrementIteration(state: ExecutionState): void {
    state.iteration++;
    state.lastActivityAt = new Date();
    logger.debug(`Iteration ${state.iteration}`);
  }

  /**
   * Detect if progress was made
   */
  detectProgress(prevMetrics: ProgressMetrics, currentMetrics: ProgressMetrics): boolean {
    // Check if files were modified
    if (currentMetrics.fileCount > prevMetrics.fileCount) {
      return true;
    }

    // Check if commits were made
    if (currentMetrics.commitCount > prevMetrics.commitCount) {
      return true;
    }

    // Check if tests were added
    if (currentMetrics.testCount > prevMetrics.testCount) {
      return true;
    }

    return false;
  }

  /**
   * Update progress metrics
   */
  updateProgress(state: ExecutionState, prevMetrics: ProgressMetrics): void {
    const hasProgress = this.detectProgress(prevMetrics, state.metrics);
    
    if (hasProgress) {
      state.metrics.noProgressCount = 0;
      logger.debug('Progress detected, resetting no-progress counter');
    } else {
      state.metrics.noProgressCount++;
      logger.warn(`No progress detected (${state.metrics.noProgressCount}/${this.config.errorRecovery.maxNoProgress})`);
    }
  }

  /**
   * Sleep between iterations
   */
  async sleep(): Promise<void> {
    if (this.config.sleepBetweenIterations > 0) {
      logger.debug(`Sleeping for ${this.config.sleepBetweenIterations}ms`);
      await new Promise(resolve => setTimeout(resolve, this.config.sleepBetweenIterations));
    }
  }
}
