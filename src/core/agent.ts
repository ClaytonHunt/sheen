// Agent - Main orchestrator (TODO: Implement)
import { AgentConfig, ProjectContext, ExecutionState } from '../utils/types';

export class Agent {
  constructor(
    private config: AgentConfig,
    private projectContext: ProjectContext
  ) {}

  async run(initialPrompt?: string): Promise<ExecutionState> {
    throw new Error('Not implemented yet');
  }

  async pause(): Promise<void> {
    throw new Error('Not implemented yet');
  }

  async resume(): Promise<void> {
    throw new Error('Not implemented yet');
  }

  async stop(): Promise<void> {
    throw new Error('Not implemented yet');
  }

  getState(): ExecutionState {
    throw new Error('Not implemented yet');
  }

  queueUserMessage(message: string): void {
    throw new Error('Not implemented yet');
  }
}
