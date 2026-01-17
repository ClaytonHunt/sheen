/**
 * Tests for OpenCodeAdapter - Wrapper for OpenCodeClient implementing AIAgent interface
 */

import { OpenCodeAdapter } from '../../src/ai/opencode-adapter';
import { OpenCodeClient } from '../../src/opencode/client';
import type {
  AgentContext,
  AgentResult,
  AgentEvent,
  ToolDefinition,
} from '../../src/ai/agent-interface';
import type {
  AgentConfig,
  ProjectContext,
  ExecutionState,
  OpenCodeResponse,
} from '../../src/utils/types';

// Mock OpenCodeClient
jest.mock('../../src/opencode/client');

describe('OpenCodeAdapter', () => {
  let adapter: OpenCodeAdapter;
  let mockClient: jest.Mocked<OpenCodeClient>;
  let context: AgentContext;

  beforeEach(() => {
    // Create mock OpenCodeClient
    mockClient = {
      execute: jest.fn(),
      isAvailable: jest.fn(),
      resetSession: jest.fn(),
      isSessionActive: jest.fn(),
      buildContextString: jest.fn(),
    } as any;

    // Initialize adapter with mock client
    adapter = new OpenCodeAdapter(mockClient);

    // Setup test context
    const projectContext: ProjectContext = {
      rootDir: '/test/project',
      type: 'nodejs',
      framework: 'express',
      language: 'typescript',
      structure: {
        directories: ['src', 'tests'],
        mainFiles: ['src/index.ts'],
        configFiles: ['package.json', 'tsconfig.json'],
      },
      git: {
        initialized: true,
        branch: 'main',
        hasUncommittedChanges: false,
      },
      hasTests: true,
      hasDocker: false,
      conventions: {
        testFramework: 'jest',
        linter: 'eslint',
        formatter: 'prettier',
      },
    };

    const executionState: ExecutionState = {
      iteration: 1,
      phase: 'implementation',
      phaseIteration: 1,
      currentTask: {
        id: 'task-1',
        description: 'Implement feature',
        status: 'in_progress',
        priority: 'high',
        phase: 'implementation',
        createdAt: new Date(),
        attempts: 1,
      },
      tasks: [],
      metrics: {
        testCount: 5,
        fileCount: 10,
        commitCount: 2,
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
      sleepBetweenIterations: 1000,
      autoCommit: false,
      autoApprove: false,
      logLevel: 'error',
      opencode: {
        streamOutput: false,
        contextWindow: 200000,
      },
      tools: ['bash', 'read', 'write', 'edit'],
      excludePatterns: ['node_modules/**', '.git/**'],
      phaseTimeouts: {
        discovery: 300000,
        planning: 300000,
        implementation: 600000,
        validation: 300000,
      },
      errorRecovery: {
        maxOpenCodeErrors: 3,
        maxTestRetries: 3,
        maxNoProgress: 5,
      },
    };

    context = {
      projectContext,
      executionState,
      configuration: config,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should execute prompt and return success result', async () => {
      const mockResponse: OpenCodeResponse = {
        toolCalls: [
          {
            tool: 'bash',
            parameters: { command: 'npm test' },
            id: 'call-1',
          },
        ],
        thinking: 'Running tests to verify implementation',
        phaseComplete: false,
      };

      mockClient.execute.mockResolvedValue(mockResponse);

      const result = await adapter.execute('Run the tests', context);

      expect(result.success).toBe(true);
      expect(result.response).toBe('Running tests to verify implementation');
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].tool).toBe('bash');
      expect(result.metadata.executionTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.tokensUsed).toBe(0); // OpenCode doesn't provide token count
      expect(result.metadata.iterationsUsed).toBe(1);
    });

    it('should handle execution errors gracefully', async () => {
      const error = new Error('OpenCode failed to execute');
      mockClient.execute.mockRejectedValue(error);

      const result = await adapter.execute('Run the tests', context);

      expect(result.success).toBe(false);
      expect(result.response).toContain('Error: OpenCode failed to execute');
      expect(result.toolCalls).toHaveLength(0);
      expect(result.metadata.iterationsUsed).toBe(0);
    });

    it('should add user and assistant messages to conversation history', async () => {
      const mockResponse: OpenCodeResponse = {
        toolCalls: [],
        thinking: 'Task completed successfully',
        phaseComplete: false,
      };

      mockClient.execute.mockResolvedValue(mockResponse);

      await adapter.execute('Complete the task', context);

      const conversation = adapter.getConversation();
      expect(conversation).toHaveLength(2);
      expect(conversation[0].role).toBe('user');
      expect(conversation[0].content).toBe('Complete the task');
      expect(conversation[1].role).toBe('assistant');
      expect(conversation[1].content).toBe('Task completed successfully');
    });

    it('should pass correct context to OpenCodeClient', async () => {
      const mockResponse: OpenCodeResponse = {
        toolCalls: [],
        thinking: 'Analyzed context',
        phaseComplete: false,
      };

      mockClient.execute.mockResolvedValue(mockResponse);

      await adapter.execute('Analyze project', context);

      expect(mockClient.execute).toHaveBeenCalledWith(
        'Analyze project',
        expect.objectContaining({
          projectContext: context.projectContext,
          currentTask: context.executionState.currentTask,
          recentHistory: expect.any(Array),
          availableTools: [],
        }),
        true
      );
    });

    it('should handle empty thinking response', async () => {
      const mockResponse: OpenCodeResponse = {
        toolCalls: [],
        thinking: undefined,
        phaseComplete: false,
      };

      mockClient.execute.mockResolvedValue(mockResponse);

      const result = await adapter.execute('Do something', context);

      expect(result.success).toBe(true);
      expect(result.response).toBe('');
    });
  });

  describe('stream', () => {
    it('should emit text, tool_call, and complete events', async () => {
      const mockResponse: OpenCodeResponse = {
        toolCalls: [
          {
            tool: 'read',
            parameters: { filePath: '/test/file.ts' },
            id: 'call-1',
          },
        ],
        thinking: 'Reading file to analyze',
        phaseComplete: false,
      };

      mockClient.execute.mockResolvedValue(mockResponse);

      const events: AgentEvent[] = [];
      for await (const event of adapter.stream('Read the file', context)) {
        events.push(event);
      }

      expect(events.length).toBeGreaterThanOrEqual(3);
      
      // Should have text event
      const textEvent = events.find((e) => e.type === 'text');
      expect(textEvent).toBeDefined();
      expect(textEvent?.data).toBe('Reading file to analyze');

      // Should have tool_call event
      const toolCallEvent = events.find((e) => e.type === 'tool_call');
      expect(toolCallEvent).toBeDefined();
      expect(toolCallEvent?.data.tool).toBe('read');

      // Should have complete event
      const completeEvent = events.find((e) => e.type === 'complete');
      expect(completeEvent).toBeDefined();
    });

    it('should emit only text and complete events when no tool calls', async () => {
      const mockResponse: OpenCodeResponse = {
        toolCalls: [],
        thinking: 'Analysis complete',
        phaseComplete: false,
      };

      mockClient.execute.mockResolvedValue(mockResponse);

      const events: AgentEvent[] = [];
      for await (const event of adapter.stream('Analyze', context)) {
        events.push(event);
      }

      expect(events.length).toBe(2);
      expect(events[0].type).toBe('text');
      expect(events[1].type).toBe('complete');
    });

    it('should include timestamps in all events', async () => {
      const mockResponse: OpenCodeResponse = {
        toolCalls: [],
        thinking: 'Done',
        phaseComplete: false,
      };

      mockClient.execute.mockResolvedValue(mockResponse);

      const events: AgentEvent[] = [];
      for await (const event of adapter.stream('Test', context)) {
        events.push(event);
      }

      for (const event of events) {
        expect(event.timestamp).toBeGreaterThan(0);
      }
    });
  });

  describe('registerTools', () => {
    it('should store tools for reference', () => {
      const tools: ToolDefinition[] = [
        {
          name: 'bash',
          description: 'Execute bash commands',
          tool: {},
        },
        {
          name: 'read',
          description: 'Read file contents',
          tool: {},
        },
      ];

      expect(() => adapter.registerTools(tools)).not.toThrow();
      // Note: OpenCode manages its own tools, so this is mainly for reference
    });

    it('should accept empty tools array', () => {
      expect(() => adapter.registerTools([])).not.toThrow();
    });
  });

  describe('getConversation', () => {
    it('should return empty array initially', () => {
      const conversation = adapter.getConversation();
      expect(conversation).toEqual([]);
    });

    it('should return copy of conversation history', async () => {
      const mockResponse: OpenCodeResponse = {
        toolCalls: [],
        thinking: 'Response',
        phaseComplete: false,
      };

      mockClient.execute.mockResolvedValue(mockResponse);

      await adapter.execute('Test', context);

      const conversation1 = adapter.getConversation();
      const conversation2 = adapter.getConversation();

      expect(conversation1).toEqual(conversation2);
      expect(conversation1).not.toBe(conversation2); // Should be different objects
    });

    it('should accumulate conversation history across multiple executions', async () => {
      const mockResponse: OpenCodeResponse = {
        toolCalls: [],
        thinking: 'Response',
        phaseComplete: false,
      };

      mockClient.execute.mockResolvedValue(mockResponse);

      await adapter.execute('First prompt', context);
      await adapter.execute('Second prompt', context);
      await adapter.execute('Third prompt', context);

      const conversation = adapter.getConversation();
      expect(conversation.length).toBe(6); // 3 user + 3 assistant messages
    });

    it('should include correct message structure', async () => {
      const mockResponse: OpenCodeResponse = {
        toolCalls: [],
        thinking: 'Response',
        phaseComplete: false,
      };

      mockClient.execute.mockResolvedValue(mockResponse);

      await adapter.execute('Test', context);

      const conversation = adapter.getConversation();
      const message = conversation[0];

      expect(message).toHaveProperty('role');
      expect(message).toHaveProperty('content');
      expect(message).toHaveProperty('timestamp');
      expect(message.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('resetConversation', () => {
    it('should clear conversation history', async () => {
      const mockResponse: OpenCodeResponse = {
        toolCalls: [],
        thinking: 'Response',
        phaseComplete: false,
      };

      mockClient.execute.mockResolvedValue(mockResponse);

      await adapter.execute('Test', context);
      expect(adapter.getConversation().length).toBeGreaterThan(0);

      adapter.resetConversation();
      expect(adapter.getConversation().length).toBe(0);
    });

    it('should reset OpenCodeClient session', () => {
      adapter.resetConversation();
      expect(mockClient.resetSession).toHaveBeenCalled();
    });
  });

  describe('getEngineName', () => {
    it('should return "opencode"', () => {
      expect(adapter.getEngineName()).toBe('opencode');
    });
  });

  describe('isAvailable', () => {
    it('should check OpenCodeClient availability', async () => {
      mockClient.isAvailable.mockResolvedValue(true);

      const available = await adapter.isAvailable();

      expect(available).toBe(true);
      expect(mockClient.isAvailable).toHaveBeenCalled();
    });

    it('should return false when OpenCode is not available', async () => {
      mockClient.isAvailable.mockResolvedValue(false);

      const available = await adapter.isAvailable();

      expect(available).toBe(false);
    });
  });

  describe('context conversion', () => {
    it('should convert system role to assistant role in history', async () => {
      // Create a custom adapter with system message in history
      const adapterWithSystemMessage = new OpenCodeAdapter(mockClient);
      
      // Use private field injection to add system message
      (adapterWithSystemMessage as any).conversationHistory.push({
        role: 'system',
        content: 'System message',
        timestamp: new Date(),
      });

      const mockResponse: OpenCodeResponse = {
        toolCalls: [],
        thinking: 'Response',
        phaseComplete: false,
      };

      mockClient.execute.mockResolvedValue(mockResponse);

      await adapterWithSystemMessage.execute('Test', context);

      const callArgs = mockClient.execute.mock.calls[0][1];
      const historyEntry = callArgs.recentHistory.find(
        (h: any) => h.content === 'System message'
      );
      
      // The adapter should convert system to assistant when building context
      // (This is done in buildOpenCodeContext method)
      expect(historyEntry?.role).toBe('assistant');
    });

    it('should preserve user and assistant roles in history', async () => {
      const mockResponse: OpenCodeResponse = {
        toolCalls: [],
        thinking: 'Response',
        phaseComplete: false,
      };

      mockClient.execute.mockResolvedValue(mockResponse);

      await adapter.execute('User message', context);

      const callArgs = mockClient.execute.mock.calls[0][1];
      const userEntry = callArgs.recentHistory.find(
        (h: any) => h.content === 'User message'
      );

      expect(userEntry?.role).toBe('user');
    });
  });
});
