import type {
  AIAgent,
  AgentContext,
  AgentResult,
  AgentEvent,
  ToolDefinition,
  ConversationMessage,
} from '../../src/ai/agent-interface';
import type { AgentConfig, ProjectContext, ExecutionState } from '../../src/utils/types';

/**
 * Mock implementation of AIAgent for testing
 */
class MockAIAgent implements AIAgent {
  private tools: ToolDefinition[] = [];
  private conversation: ConversationMessage[] = [];

  async execute(prompt: string, context: AgentContext): Promise<AgentResult> {
    this.conversation.push({
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    });

    this.conversation.push({
      role: 'assistant',
      content: 'Mock response',
      timestamp: new Date(),
    });

    return {
      success: true,
      response: 'Mock response',
      toolCalls: [],
      metadata: {
        tokensUsed: 100,
        executionTimeMs: 50,
        iterationsUsed: 1,
      },
    };
  }

  async *stream(prompt: string, context: AgentContext): AsyncIterable<AgentEvent> {
    yield {
      type: 'text',
      data: 'Mock',
      timestamp: Date.now(),
    };

    yield {
      type: 'text',
      data: ' response',
      timestamp: Date.now(),
    };

    yield {
      type: 'complete',
      data: { text: 'Mock response' },
      timestamp: Date.now(),
    };
  }

  registerTools(tools: ToolDefinition[]): void {
    this.tools = tools;
  }

  getConversation(): ConversationMessage[] {
    return [...this.conversation];
  }

  resetConversation(): void {
    this.conversation = [];
  }

  getEngineName(): string {
    return 'mock';
  }
}

describe('AIAgent Interface', () => {
  let agent: AIAgent;
  let context: AgentContext;

  beforeEach(() => {
    agent = new MockAIAgent();

    const projectContext: ProjectContext = {
      rootDir: process.cwd(),
      type: 'nodejs',
      structure: { directories: [], mainFiles: [], configFiles: [] },
      hasTests: false,
      hasDocker: false,
      conventions: {},
    };

    const executionState: ExecutionState = {
      iteration: 0,
      phase: 'implementation',
      phaseIteration: 0,
      tasks: [],
      metrics: {
        testCount: 0,
        fileCount: 0,
        commitCount: 0,
        noProgressCount: 0,
      },
      errors: [],
      startedAt: new Date(),
      lastActivityAt: new Date(),
      paused: false,
      userMessages: [],
      projectContext,
    };

    const config: AgentConfig = {
      maxIterations: 10,
      sleepBetweenIterations: 0,
      autoCommit: false,
      autoApprove: true,
      logLevel: 'error',
      opencode: { streamOutput: false, contextWindow: 200000 },
      tools: [],
      excludePatterns: [],
      phaseTimeouts: { discovery: 300000, planning: 300000, implementation: 600000, validation: 300000 },
      errorRecovery: { maxOpenCodeErrors: 3, maxTestRetries: 3, maxNoProgress: 5 },
    };

    context = {
      projectContext,
      executionState,
      configuration: config,
    };
  });

  describe('execute', () => {
    it('should execute a prompt and return a result', async () => {
      const result = await agent.execute('Test prompt', context);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.response).toBe('Mock response');
      expect(result.toolCalls).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.tokensUsed).toBeGreaterThanOrEqual(0);
      expect(result.metadata.executionTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.iterationsUsed).toBeGreaterThanOrEqual(0);
    });

    it('should add messages to conversation history', async () => {
      await agent.execute('Test prompt', context);

      const conversation = agent.getConversation();
      expect(conversation.length).toBeGreaterThan(0);
      expect(conversation[0].role).toBe('user');
      expect(conversation[0].content).toBe('Test prompt');
    });
  });

  describe('stream', () => {
    it('should stream events', async () => {
      const events: AgentEvent[] = [];

      for await (const event of agent.stream('Test prompt', context)) {
        events.push(event);
      }

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe('text');
      expect(events[events.length - 1].type).toBe('complete');
    });

    it('should emit text and complete events', async () => {
      const events: AgentEvent[] = [];

      for await (const event of agent.stream('Test prompt', context)) {
        events.push(event);
      }

      const hasText = events.some((e) => e.type === 'text');
      const hasComplete = events.some((e) => e.type === 'complete');

      expect(hasText).toBe(true);
      expect(hasComplete).toBe(true);
    });
  });

  describe('registerTools', () => {
    it('should register tools', () => {
      const tools: ToolDefinition[] = [
        {
          name: 'test_tool',
          description: 'A test tool',
          tool: {},
        },
      ];

      expect(() => agent.registerTools(tools)).not.toThrow();
    });
  });

  describe('getConversation', () => {
    it('should return conversation history', async () => {
      await agent.execute('Test prompt', context);

      const conversation = agent.getConversation();
      expect(Array.isArray(conversation)).toBe(true);
      expect(conversation.length).toBeGreaterThan(0);
    });

    it('should return messages with correct structure', async () => {
      await agent.execute('Test prompt', context);

      const conversation = agent.getConversation();
      const message = conversation[0];

      expect(message.role).toBeDefined();
      expect(message.content).toBeDefined();
      expect(message.timestamp).toBeDefined();
      expect(message.timestamp instanceof Date).toBe(true);
    });
  });

  describe('resetConversation', () => {
    it('should clear conversation history', async () => {
      await agent.execute('Test prompt', context);
      expect(agent.getConversation().length).toBeGreaterThan(0);

      agent.resetConversation();
      expect(agent.getConversation().length).toBe(0);
    });
  });

  describe('getEngineName', () => {
    it('should return engine name', () => {
      const name = agent.getEngineName();
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    });
  });
});
