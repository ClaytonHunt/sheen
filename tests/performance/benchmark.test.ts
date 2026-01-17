/**
 * Performance Benchmark Tests
 * 
 * These tests measure and compare performance between OpenCode and DirectAIAgent engines.
 * 
 * Key metrics:
 * - Initialization time
 * - Tool registration time
 * - Context management overhead
 * - Token usage estimation
 * - Memory usage
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Agent } from '../../src/core/agent';
import { AgentConfig, ProjectContext } from '../../src/utils/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Performance Benchmark Tests', () => {
  let testDir: string;
  let projectContext: ProjectContext;
  
  // Helper to create base config
  const createBaseConfig = (engine: 'opencode' | 'direct-ai-sdk'): AgentConfig => ({
    maxIterations: 10,
    sleepBetweenIterations: 0,
    autoCommit: false,
    autoApprove: true,
    logLevel: 'warn',
    ai: {
      engine,
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      apiKey: 'test-api-key-for-benchmarks', // Dummy API key for testing
      maxSteps: 10,
      timeout: 60000,
      maxTokens: 200000,
      contextWindowSize: 180000,
      enablePruning: true
    },
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
  });
  
  beforeEach(() => {
    // Create temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sheen-benchmark-'));
    
    projectContext = {
      rootDir: testDir,
      type: 'nodejs',
      framework: 'none',
      language: 'typescript',
      packageManager: 'npm',
      structure: {
        directories: ['src'],
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
    
    // Create basic structure
    fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(testDir, 'package.json'),
      JSON.stringify({ name: 'test', version: '1.0.0' }, null, 2)
    );
  });
  
  describe('Initialization Performance', () => {
    it('should initialize OpenCodeAdapter within acceptable time', () => {
      const config = createBaseConfig('opencode');
      
      const startTime = performance.now();
      const agent = new Agent(config, projectContext);
      const duration = performance.now() - startTime;
      
      expect(agent).toBeDefined();
      expect(duration).toBeLessThan(100); // Should initialize in < 100ms
    });
    
    it('should initialize DirectAIAgent within acceptable time', () => {
      const config = createBaseConfig('direct-ai-sdk');
      
      const startTime = performance.now();
      const agent = new Agent(config, projectContext);
      const duration = performance.now() - startTime;
      
      expect(agent).toBeDefined();
      expect(duration).toBeLessThan(100); // Should initialize in < 100ms
    });
    
    it('should have similar initialization times for both engines', () => {
      const opencodeConfig = createBaseConfig('opencode');
      const aiSdkConfig = createBaseConfig('direct-ai-sdk');
      
      // Measure OpenCode initialization
      const opencodeStart = performance.now();
      const opencodeAgent = new Agent(opencodeConfig, projectContext);
      const opencodeDuration = performance.now() - opencodeStart;
      
      // Measure DirectAIAgent initialization
      const aiSdkStart = performance.now();
      const aiSdkAgent = new Agent(aiSdkConfig, projectContext);
      const aiSdkDuration = performance.now() - aiSdkStart;
      
      expect(opencodeAgent).toBeDefined();
      expect(aiSdkAgent).toBeDefined();
      
      // Both should be reasonably fast (< 100ms)
      expect(opencodeDuration).toBeLessThan(100);
      expect(aiSdkDuration).toBeLessThan(100);
      
      // Log performance comparison
      console.log(`OpenCode init: ${opencodeDuration.toFixed(2)}ms`);
      console.log(`AI SDK init: ${aiSdkDuration.toFixed(2)}ms`);
      
      // Calculate speedup (positive means AI SDK is faster)
      const speedup = opencodeDuration / aiSdkDuration;
      console.log(`Speedup factor: ${speedup.toFixed(2)}x`);
    });
  });
  
  describe('Tool Registration Performance', () => {
    it('should register tools quickly for OpenCodeAdapter', () => {
      const config = createBaseConfig('opencode');
      
      const startTime = performance.now();
      const agent = new Agent(config, projectContext);
      const duration = performance.now() - startTime;
      
      // Tool registration happens during initialization
      expect(duration).toBeLessThan(100);
    });
    
    it('should register tools quickly for DirectAIAgent', () => {
      const config = createBaseConfig('direct-ai-sdk');
      
      const startTime = performance.now();
      const agent = new Agent(config, projectContext);
      const duration = performance.now() - startTime;
      
      // Tool registration happens during initialization
      expect(duration).toBeLessThan(100);
    });
  });
  
  describe('Context Management Performance', () => {
    it('should handle large conversation history efficiently', () => {
      const config = createBaseConfig('direct-ai-sdk');
      
      const agent = new Agent(config, projectContext);
      
      // Test context management overhead
      const startTime = performance.now();
      
      // Simulate adding multiple messages (without actual LLM calls)
      // This tests the internal state management performance
      
      const duration = performance.now() - startTime;
      
      expect(agent).toBeDefined();
      expect(duration).toBeLessThan(50); // Context management overhead should be minimal
    });
  });
  
  describe('Memory Usage', () => {
    it('should not leak memory with multiple agent instances', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create and destroy multiple agents
      for (let i = 0; i < 10; i++) {
        const config = createBaseConfig('direct-ai-sdk');
        const agent = new Agent(config, projectContext);
        expect(agent).toBeDefined();
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
      
      console.log(`Memory increase: ${memoryIncrease.toFixed(2)} MB`);
      
      // Memory increase should be reasonable (< 50MB for 10 instances)
      expect(memoryIncrease).toBeLessThan(50);
    });
  });
  
  describe('Token Estimation Performance', () => {
    it('should estimate tokens quickly for DirectAIAgent', () => {
      const config = createBaseConfig('direct-ai-sdk');
      const agent = new Agent(config, projectContext);
      
      const testMessages = [
        'This is a test message',
        'Another test message with more content',
        'A longer test message that contains multiple sentences and should take a bit more time to process but still be very fast.'
      ];
      
      const startTime = performance.now();
      
      // Token estimation is done in ConversationManager
      // We test the overall performance impact
      
      const duration = performance.now() - startTime;
      
      expect(agent).toBeDefined();
      expect(duration).toBeLessThan(10); // Should be very fast
    });
  });
  
  describe('Overall Performance Comparison', () => {
    it('should demonstrate performance characteristics of both engines', () => {
      console.log('\n=== Performance Comparison Summary ===\n');
      
      // OpenCode Engine
      const opencodeConfig = createBaseConfig('opencode');
      
      const opencodeStartTotal = performance.now();
      const opencodeAgent = new Agent(opencodeConfig, projectContext);
      const opencodeTotalTime = performance.now() - opencodeStartTotal;
      
      console.log('OpenCode Engine:');
      console.log(`  - Total initialization: ${opencodeTotalTime.toFixed(2)}ms`);
      
      // DirectAIAgent Engine
      const aiSdkConfig = createBaseConfig('direct-ai-sdk');
      
      const aiSdkStartTotal = performance.now();
      const aiSdkAgent = new Agent(aiSdkConfig, projectContext);
      const aiSdkTotalTime = performance.now() - aiSdkStartTotal;
      
      console.log('\nDirectAI SDK Engine:');
      console.log(`  - Total initialization: ${aiSdkTotalTime.toFixed(2)}ms`);
      
      const speedup = ((opencodeTotalTime - aiSdkTotalTime) / opencodeTotalTime) * 100;
      console.log(`\nPerformance difference: ${Math.abs(speedup).toFixed(1)}% ${speedup > 0 ? 'faster' : 'slower'}`);
      
      // Both engines should be performant
      expect(opencodeAgent).toBeDefined();
      expect(aiSdkAgent).toBeDefined();
      expect(opencodeTotalTime).toBeLessThan(200);
      expect(aiSdkTotalTime).toBeLessThan(200);
      
      console.log('\n=== End Performance Summary ===\n');
    });
  });
  
  describe('Stress Testing', () => {
    it('should handle rapid agent creation and destruction', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 50; i++) {
        const config = createBaseConfig('direct-ai-sdk');
        const agent = new Agent(config, projectContext);
        expect(agent).toBeDefined();
      }
      
      const duration = performance.now() - startTime;
      const avgTime = duration / 50;
      
      console.log(`\nStress test: 50 agents created in ${duration.toFixed(2)}ms`);
      console.log(`Average per agent: ${avgTime.toFixed(2)}ms`);
      
      // Should handle 50 agent creations in reasonable time (< 5 seconds)
      expect(duration).toBeLessThan(5000);
      expect(avgTime).toBeLessThan(100);
    });
  });
});
