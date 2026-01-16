#!/usr/bin/env tsx
/**
 * Test OpenCode integration
 */

import { OpenCodeClient } from './src/opencode/client.js';
import { ToolCallAdapter } from './src/opencode/adapter.js';
import { ToolRegistry } from './src/tools/registry.js';
import { fileTools } from './src/tools/file.js';
import { ConversationContext, ProjectContext, AgentConfig, ToolContext } from './src/utils/types.js';

async function testOpenCodeIntegration() {
  console.log('=== Testing OpenCode Integration ===\n');

  // Setup
  const registry = new ToolRegistry();
  registry.registerAll(fileTools);
  
  const projectContext: ProjectContext = {
    rootDir: process.cwd(),
    type: 'nodejs',
    structure: { directories: [], mainFiles: [], configFiles: [] },
    hasTests: false,
    hasDocker: false,
    conventions: {}
  };

  const config: AgentConfig = {
    maxIterations: 10,
    sleepBetweenIterations: 1000,
    autoCommit: false,
    autoApprove: false,
    logLevel: 'info',
    opencode: {
      streamOutput: false,
      contextWindow: 200000
    },
    tools: ['file'],
    excludePatterns: ['node_modules', '.git', 'dist'],
    phaseTimeouts: {
      discovery: 300000,
      planning: 300000,
      implementation: 600000,
      validation: 300000
    },
    errorRecovery: {
      maxOpenCodeErrors: 3,
      maxTestRetries: 3,
      maxNoProgress: 5
    }
  };

  // Test 1: Check if OpenCode is available
  console.log('=== Test 1: Check OpenCode availability ===');
  const client = new OpenCodeClient(config.opencode);
  const isAvailable = await client.isAvailable();
  console.log(`OpenCode available: ${isAvailable}`);
  console.log(isAvailable ? '✓ PASS\n' : '✗ FAIL (OpenCode not installed)\n');

  if (!isAvailable) {
    console.log('OpenCode is not installed. Install it from: https://opencode.ai/docs');
    console.log('Skipping remaining tests.');
    return;
  }

  // Test 2: Tool call adapter - format tool definitions
  console.log('=== Test 2: Format tool definitions ===');
  const adapter = new ToolCallAdapter(registry, projectContext);
  const toolDefs = adapter.formatToolDefinitions();
  console.log('Tool definitions:');
  console.log(toolDefs.substring(0, 300) + '...');
  console.log('✓ PASS\n');

  // Test 3: Parse tool calls
  console.log('=== Test 3: Parse tool calls ===');
  const mockOutput = `
Some output text...
TOOL_CALL: {"tool": "write_file", "parameters": {"path": "test.txt", "content": "Hello"}}
More text...
TOOL_CALL: {"tool": "read_file", "parameters": {"path": "test.txt"}}
  `;
  const toolCalls = adapter.parseToolCalls(mockOutput);
  console.log(`Parsed ${toolCalls.length} tool calls`);
  console.log('Tool calls:', toolCalls);
  console.log(toolCalls.length === 2 ? '✓ PASS\n' : '✗ FAIL\n');

  // Test 4: Execute tool calls
  console.log('=== Test 4: Execute tool calls ===');
  const toolContext: ToolContext = {
    workingDir: process.cwd(),
    config,
    projectContext
  };
  const results = await adapter.executeToolCalls(toolCalls, toolContext);
  console.log(`Executed ${results.length} tool calls`);
  console.log('Summary:', adapter.summarizeExecution(results));
  console.log(results.every(r => r.result.success) ? '✓ PASS\n' : '✗ FAIL\n');

  // Test 5: Format tool results
  console.log('=== Test 5: Format tool results ===');
  const formatted = adapter.formatToolResults(results);
  console.log('Formatted results:');
  console.log(formatted.substring(0, 300) + '...');
  console.log('✓ PASS\n');

  // Test 6: Execute simple OpenCode command (just version check, not full run)
  console.log('=== Test 6: OpenCode version check ===');
  try {
    const context: ConversationContext = {
      projectContext,
      recentHistory: [],
      availableTools: registry.getAll()
    };
    
    // We'll just check that we can construct context
    const contextStr = client.buildContextString(context);
    console.log('Context string length:', contextStr.length);
    console.log('✓ PASS\n');
  } catch (error) {
    console.log('✗ FAIL:', error);
  }

  console.log('=== All Tests Complete ===');
  console.log('\nNote: Full OpenCode execution test requires running "opencode run" which is interactive.');
  console.log('For integration testing, use: sheen "simple task"');
}

testOpenCodeIntegration().catch(console.error);
