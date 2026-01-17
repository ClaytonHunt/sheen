/**
 * End-to-End Integration Tests for Autonomous Execution
 * 
 * These tests verify that the Agent can execute autonomous tasks
 * end-to-end using both OpenCode and DirectAIAgent engines.
 * 
 * Note: These tests verify the integration layer, not actual LLM execution.
 * Real execution would require valid API keys and LLM calls.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Agent } from '../../src/core/agent';
import { AgentConfig, ProjectContext } from '../../src/utils/types';
import { ExecutionLoop } from '../../src/core/loop';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('E2E Autonomous Execution Tests', () => {
  let testDir: string;
  let projectContext: ProjectContext;
  
  beforeEach(() => {
    // Create temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sheen-e2e-test-'));
    
    projectContext = {
      rootDir: testDir,
      type: 'nodejs',
      framework: 'none',
      language: 'typescript',
      packageManager: 'npm',
      structure: {
        directories: ['src', 'tests'],
        mainFiles: ['package.json'],
        configFiles: ['tsconfig.json']
      },
      hasTests: true,
      hasDocker: false,
      conventions: {
        testFramework: 'jest',
        linter: 'eslint',
        formatter: 'prettier',
        commitStyle: 'conventional'
      }
    };
    
    // Create basic project structure
    fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'tests'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '.sheen'), { recursive: true });
    
    // Create package.json
    fs.writeFileSync(
      path.join(testDir, 'package.json'),
      JSON.stringify({ 
        name: 'test-project', 
        version: '1.0.0',
        scripts: {
          test: 'jest',
          build: 'tsc'
        }
      }, null, 2)
    );
  });
  
  afterEach(() => {
    // Cleanup test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });
  
  /**
   * Helper to create agent with specific engine
   */
  function createTestAgent(engine: 'opencode' | 'direct-ai-sdk'): Agent {
    const config: AgentConfig = {
      maxIterations: 5,
      sleepBetweenIterations: 0,
      autoCommit: false,
      autoApprove: true,
      logLevel: 'error',
      opencode: {
        streamOutput: false,
        contextWindow: 200000
      },
      tools: ['read', 'write', 'edit', 'bash', 'git'],
      excludePatterns: ['node_modules', '.git'],
      phaseTimeouts: {
        discovery: 300000,
        planning: 300000,
        implementation: 600000,
        validation: 300000
      },
      errorRecovery: {
        maxOpenCodeErrors: 3,
        maxTestRetries: 2,
        maxNoProgress: 5
      }
    };
    
    if (engine === 'direct-ai-sdk') {
      config.ai = {
        engine: 'direct-ai-sdk',
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        apiKey: 'sk-ant-test-dummy-key-for-testing-only',
        maxSteps: 10,
        timeout: 60000,
        maxTokens: 200000,
        contextWindowSize: 180000,
        enablePruning: true
      };
    } else {
      config.ai = {
        engine: 'opencode',
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        maxSteps: 10,
        timeout: 60000,
        maxTokens: 200000,
        contextWindowSize: 180000,
        enablePruning: true
      };
    }
    
    return new Agent(config, projectContext);
  }
  
  describe('Agent Lifecycle', () => {
    it('should initialize agent with OpenCode engine', () => {
      const agent = createTestAgent('opencode');
      
      expect(agent).toBeDefined();
      expect(agent.isRunning()).toBe(false);
      
      const state = agent.getState();
      expect(state.iteration).toBe(0);
      expect(state.phase).toBe('implementation');
      expect(state.paused).toBe(false);
    });
    
    it('should initialize agent with DirectAIAgent engine', () => {
      const agent = createTestAgent('direct-ai-sdk');
      
      expect(agent).toBeDefined();
      expect(agent.isRunning()).toBe(false);
      
      const state = agent.getState();
      expect(state.iteration).toBe(0);
      expect(state.phase).toBe('implementation');
      expect(state.paused).toBe(false);
    });
    
    it('should support pause and resume operations', async () => {
      const agent = createTestAgent('direct-ai-sdk');
      
      expect(agent.getState().paused).toBe(false);
      
      await agent.pause();
      expect(agent.getState().paused).toBe(true);
      
      await agent.resume();
      expect(agent.getState().paused).toBe(false);
    });
    
    it('should track agent running state', async () => {
      const agent = createTestAgent('direct-ai-sdk');
      
      expect(agent.isRunning()).toBe(false);
      
      // Note: We don't actually run the agent here as it would require LLM calls
      // The running state is tested in integration with real execution
    });
  });
  
  describe('Execution Loop Integration', () => {
    it('should create ExecutionLoop with config', () => {
      const config: AgentConfig = {
        maxIterations: 10,
        sleepBetweenIterations: 100,
        autoCommit: false,
        autoApprove: true,
        logLevel: 'error',
        opencode: {
          streamOutput: false,
          contextWindow: 200000
        },
        tools: [],
        excludePatterns: [],
        phaseTimeouts: {
          discovery: 300000,
          planning: 300000,
          implementation: 600000,
          validation: 300000
        },
        errorRecovery: {
          maxOpenCodeErrors: 3,
          maxTestRetries: 2,
          maxNoProgress: 5
        }
      };
      
      const loop = new ExecutionLoop(config);
      expect(loop).toBeDefined();
    });
    
    it('should respect stopping conditions', () => {
      const config: AgentConfig = {
        maxIterations: 5,
        sleepBetweenIterations: 0,
        autoCommit: false,
        autoApprove: true,
        logLevel: 'error',
        opencode: {
          streamOutput: false,
          contextWindow: 200000
        },
        tools: [],
        excludePatterns: [],
        phaseTimeouts: {
          discovery: 300000,
          planning: 300000,
          implementation: 600000,
          validation: 300000
        },
        errorRecovery: {
          maxOpenCodeErrors: 3,
          maxTestRetries: 2,
          maxNoProgress: 5
        }
      };
      
      const loop = new ExecutionLoop(config);
      
      const state = {
        iteration: 0,
        phase: 'implementation' as const,
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
      
      // Should continue at iteration 0
      expect(loop.shouldContinue(state)).toBe(true);
      
      // Should stop when paused
      state.paused = true;
      expect(loop.shouldContinue(state)).toBe(false);
      state.paused = false;
      
      // Should stop when phase is complete
      state.phase = 'complete' as any; // 'complete' is a valid phase but not in the Phase type
      expect(loop.shouldContinue(state)).toBe(false);
      state.phase = 'implementation';
      
      // Should stop when max iterations reached
      state.iteration = 5;
      expect(loop.shouldContinue(state)).toBe(false);
    });
    
    it('should increment iteration correctly', () => {
      const config: AgentConfig = {
        maxIterations: 10,
        sleepBetweenIterations: 0,
        autoCommit: false,
        autoApprove: true,
        logLevel: 'error',
        opencode: {
          streamOutput: false,
          contextWindow: 200000
        },
        tools: [],
        excludePatterns: [],
        phaseTimeouts: {
          discovery: 300000,
          planning: 300000,
          implementation: 600000,
          validation: 300000
        },
        errorRecovery: {
          maxOpenCodeErrors: 3,
          maxTestRetries: 2,
          maxNoProgress: 5
        }
      };
      
      const loop = new ExecutionLoop(config);
      
      const state = {
        iteration: 0,
        phase: 'implementation' as const,
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
      
      expect(state.iteration).toBe(0);
      
      loop.incrementIteration(state);
      expect(state.iteration).toBe(1);
      
      loop.incrementIteration(state);
      expect(state.iteration).toBe(2);
    });
    
    it('should detect progress changes', () => {
      const config: AgentConfig = {
        maxIterations: 10,
        sleepBetweenIterations: 0,
        autoCommit: false,
        autoApprove: true,
        logLevel: 'error',
        opencode: {
          streamOutput: false,
          contextWindow: 200000
        },
        tools: [],
        excludePatterns: [],
        phaseTimeouts: {
          discovery: 300000,
          planning: 300000,
          implementation: 600000,
          validation: 300000
        },
        errorRecovery: {
          maxOpenCodeErrors: 3,
          maxTestRetries: 2,
          maxNoProgress: 5
        }
      };
      
      const loop = new ExecutionLoop(config);
      
      const prevMetrics = {
        testCount: 0,
        fileCount: 0,
        commitCount: 0,
        noProgressCount: 0
      };
      
      const currentMetrics = {
        testCount: 0,
        fileCount: 1, // File was modified
        commitCount: 0,
        noProgressCount: 0
      };
      
      expect(loop.detectProgress(prevMetrics, currentMetrics)).toBe(true);
      
      // No progress
      expect(loop.detectProgress(prevMetrics, prevMetrics)).toBe(false);
    });
  });
  
  describe('State Management', () => {
    it('should initialize with correct default state', () => {
      const agent = createTestAgent('direct-ai-sdk');
      const state = agent.getState();
      
      expect(state.iteration).toBe(0);
      expect(state.phase).toBe('implementation');
      expect(state.phaseIteration).toBe(0);
      expect(state.tasks).toEqual([]);
      expect(state.errors).toEqual([]);
      expect(state.paused).toBe(false);
      expect(state.userMessages).toEqual([]);
      expect(state.metrics).toEqual({
        testCount: 0,
        fileCount: 0,
        commitCount: 0,
        noProgressCount: 0
      });
    });
    
    it('should queue user messages correctly', () => {
      const agent = createTestAgent('direct-ai-sdk');
      
      expect(agent.getState().userMessages.length).toBe(0);
      
      agent.queueUserMessage('First message');
      expect(agent.getState().userMessages.length).toBe(1);
      expect(agent.getState().userMessages[0].message).toBe('First message');
      expect(agent.getState().userMessages[0].processed).toBe(false);
      
      agent.queueUserMessage('Second message');
      expect(agent.getState().userMessages.length).toBe(2);
      expect(agent.getState().userMessages[1].message).toBe('Second message');
    });
    
    it('should maintain separate state for each agent instance', () => {
      const agent1 = createTestAgent('opencode');
      const agent2 = createTestAgent('direct-ai-sdk');
      
      agent1.queueUserMessage('Message for agent 1');
      agent2.queueUserMessage('Message for agent 2');
      
      expect(agent1.getState().userMessages.length).toBe(1);
      expect(agent2.getState().userMessages.length).toBe(1);
      expect(agent1.getState().userMessages[0].message).not.toBe(
        agent2.getState().userMessages[0].message
      );
    });
  });
  
  describe('Tool Integration', () => {
    it('should have tools registered for OpenCode engine', () => {
      const agent = createTestAgent('opencode');
      const tools = agent.getTools();
      
      expect(tools).toBeDefined();
      expect(tools.length).toBeGreaterThan(0);
      
      // Check for essential tools
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('read_file');
      expect(toolNames).toContain('write_file');
      expect(toolNames).toContain('git_status');
    });
    
    it('should have access to planner for both engines', () => {
      const opencodeAgent = createTestAgent('opencode');
      const sdkAgent = createTestAgent('direct-ai-sdk');
      
      expect(opencodeAgent.getPlanner()).toBeDefined();
      expect(sdkAgent.getPlanner()).toBeDefined();
    });
  });
  
  describe('Error Handling', () => {
    it('should handle stop operation gracefully', async () => {
      const agent = createTestAgent('direct-ai-sdk');
      
      expect(agent.isRunning()).toBe(false);
      
      // Should not throw when stopping non-running agent
      await expect(agent.stop()).resolves.not.toThrow();
      
      expect(agent.isRunning()).toBe(false);
    });
    
    it('should track errors in state', () => {
      const agent = createTestAgent('direct-ai-sdk');
      const state = agent.getState();
      
      expect(state.errors).toBeDefined();
      expect(state.errors.length).toBe(0);
      
      // Note: Error tracking is tested during actual execution
      // Here we just verify the structure exists
    });
  });
});
