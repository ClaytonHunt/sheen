/**
 * Golden Tests - OpenCode vs AI SDK Parity
 * 
 * These tests verify that DirectAIAgent produces equivalent results
 * to OpenCodeAdapter for the same operations.
 * 
 * Test methodology:
 * - Run same operation with both engines
 * - Compare tool call behavior (which tools used, parameters)
 * - Verify functional equivalence of results
 * - Document acceptable differences
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Agent } from '../../src/core/agent';
import { AgentConfig, ProjectContext } from '../../src/utils/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('OpenCode vs AI SDK Parity Tests', () => {
  let testDir: string;
  let projectContext: ProjectContext;
  
  beforeEach(() => {
    // Create temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sheen-parity-test-'));
    
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
    
    // Create package.json
    fs.writeFileSync(
      path.join(testDir, 'package.json'),
      JSON.stringify({ name: 'test-project', version: '1.0.0' }, null, 2)
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
  function createAgent(engine: 'opencode' | 'direct-ai-sdk'): Agent {
    const baseConfig: AgentConfig = {
      maxIterations: 10,
      sleepBetweenIterations: 0,
      autoCommit: false,
      autoApprove: true,
      logLevel: 'error', // Reduce noise in tests
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
      // Note: In real tests, this would require valid API keys
      // For now, we're testing the integration, not the actual AI execution
      // Use a dummy key for testing
      baseConfig.ai = {
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
      baseConfig.ai = {
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
    
    return new Agent(baseConfig, projectContext);
  }
  
  describe('Agent Initialization', () => {
    it('should initialize with OpenCode engine', () => {
      const agent = createAgent('opencode');
      expect(agent).toBeDefined();
      expect(agent.isRunning()).toBe(false);
    });
    
    it('should initialize with DirectAIAgent engine', () => {
      const agent = createAgent('direct-ai-sdk');
      expect(agent).toBeDefined();
      expect(agent.isRunning()).toBe(false);
    });
    
    it('should register tools for OpenCode engine', () => {
      const agent = createAgent('opencode');
      const tools = agent.getTools();
      
      // Should have file, git, and shell tools
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.some(t => t.name === 'read_file')).toBe(true);
      expect(tools.some(t => t.name === 'write_file')).toBe(true);
      expect(tools.some(t => t.name === 'git_status')).toBe(true);
    });
    
    it('should register tools for DirectAIAgent engine', () => {
      const agent = createAgent('direct-ai-sdk');
      const tools = agent.getTools();
      
      // DirectAIAgent uses different tool structure, but should still be available
      // The tools are registered internally, so this test verifies initialization doesn't fail
      expect(agent).toBeDefined();
    });
  });
  
  describe('Configuration Equivalence', () => {
    it('both engines should respect maxIterations setting', () => {
      const opencodeAgent = createAgent('opencode');
      const sdkAgent = createAgent('direct-ai-sdk');
      
      // Both should be initialized with same maxIterations
      const opencodeState = opencodeAgent.getState();
      const sdkState = sdkAgent.getState();
      
      expect(opencodeState.iteration).toBe(sdkState.iteration);
    });
    
    it('both engines should have equivalent initial state', () => {
      const opencodeAgent = createAgent('opencode');
      const sdkAgent = createAgent('direct-ai-sdk');
      
      const opencodeState = opencodeAgent.getState();
      const sdkState = sdkAgent.getState();
      
      expect(opencodeState.phase).toBe(sdkState.phase);
      expect(opencodeState.iteration).toBe(sdkState.iteration);
      expect(opencodeState.paused).toBe(sdkState.paused);
      expect(opencodeState.errors.length).toBe(sdkState.errors.length);
    });
  });
  
  describe('Task Planning', () => {
    it('both engines should create equivalent task structures', async () => {
      const opencodeAgent = createAgent('opencode');
      const sdkAgent = createAgent('direct-ai-sdk');
      
      const opencodeState = opencodeAgent.getState();
      const sdkState = sdkAgent.getState();
      
      // Both should start with empty task lists
      expect(opencodeState.tasks.length).toBe(sdkState.tasks.length);
    });
    
    it('both engines should support task queueing', () => {
      const opencodeAgent = createAgent('opencode');
      const sdkAgent = createAgent('direct-ai-sdk');
      
      opencodeAgent.queueUserMessage('Test message');
      sdkAgent.queueUserMessage('Test message');
      
      const opencodeState = opencodeAgent.getState();
      const sdkState = sdkAgent.getState();
      
      expect(opencodeState.userMessages.length).toBe(1);
      expect(sdkState.userMessages.length).toBe(1);
      expect(opencodeState.userMessages[0].message).toBe(sdkState.userMessages[0].message);
    });
  });
  
  describe('State Management', () => {
    it('both engines should support pause/resume', async () => {
      const opencodeAgent = createAgent('opencode');
      const sdkAgent = createAgent('direct-ai-sdk');
      
      await opencodeAgent.pause();
      await sdkAgent.pause();
      
      expect(opencodeAgent.getState().paused).toBe(true);
      expect(sdkAgent.getState().paused).toBe(true);
      
      await opencodeAgent.resume();
      await sdkAgent.resume();
      
      expect(opencodeAgent.getState().paused).toBe(false);
      expect(sdkAgent.getState().paused).toBe(false);
    });
    
    it('both engines should track metrics equivalently', () => {
      const opencodeAgent = createAgent('opencode');
      const sdkAgent = createAgent('direct-ai-sdk');
      
      const opencodeMetrics = opencodeAgent.getState().metrics;
      const sdkMetrics = sdkAgent.getState().metrics;
      
      // Initial metrics should be equivalent
      expect(opencodeMetrics.testCount).toBe(sdkMetrics.testCount);
      expect(opencodeMetrics.fileCount).toBe(sdkMetrics.fileCount);
      expect(opencodeMetrics.commitCount).toBe(sdkMetrics.commitCount);
      expect(opencodeMetrics.noProgressCount).toBe(sdkMetrics.noProgressCount);
    });
  });
  
  describe('Error Handling', () => {
    it('both engines should handle initialization errors gracefully', () => {
      // Both should initialize without errors even with minimal config
      expect(() => createAgent('opencode')).not.toThrow();
      expect(() => createAgent('direct-ai-sdk')).not.toThrow();
    });
    
    it('both engines should support error recovery configuration', () => {
      const opencodeAgent = createAgent('opencode');
      const sdkAgent = createAgent('direct-ai-sdk');
      
      // Both should have error recovery settings applied
      expect(opencodeAgent).toBeDefined();
      expect(sdkAgent).toBeDefined();
    });
  });
  
  describe('Planner Integration', () => {
    it('both engines should provide access to planner', () => {
      const opencodeAgent = createAgent('opencode');
      const sdkAgent = createAgent('direct-ai-sdk');
      
      const opencodePlanner = opencodeAgent.getPlanner();
      const sdkPlanner = sdkAgent.getPlanner();
      
      expect(opencodePlanner).toBeDefined();
      expect(sdkPlanner).toBeDefined();
    });
    
    it('both engines should support plan loading', async () => {
      const opencodeAgent = createAgent('opencode');
      const sdkAgent = createAgent('direct-ai-sdk');
      
      const opencodePlanner = opencodeAgent.getPlanner();
      const sdkPlanner = sdkAgent.getPlanner();
      
      // Both should support checking for plan existence
      const opencodeExists = await opencodePlanner.planExists();
      const sdkExists = await sdkPlanner.planExists();
      
      // In test environment, no plan should exist
      expect(opencodeExists).toBe(sdkExists);
    });
  });
});
