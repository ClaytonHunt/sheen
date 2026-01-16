import { AgentConfig, ExecutionState, ProgressMetrics } from '../utils/types.js';
import { logger } from '../utils/logger.js';

/**
 * Execution loop for autonomous agent iterations
 */
export class ExecutionLoop {
  constructor(private config: AgentConfig) {}

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
