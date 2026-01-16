#!/usr/bin/env tsx
/**
 * Simple test script for tool system
 */

import { ToolRegistry } from './src/tools/registry.js';
import { fileTools } from './src/tools/file.js';
import { ToolContext, AgentConfig, ProjectContext } from './src/utils/types.js';
import { logger } from './src/utils/logger.js';

async function testTools() {
  console.log('=== Testing Tool System ===\n');
  
  // Create registry
  const registry = new ToolRegistry();
  console.log('✓ Created ToolRegistry');
  
  // Register file tools
  registry.registerAll(fileTools);
  console.log(`✓ Registered ${registry.count()} tools`);
  console.log(`  Tools: ${registry.getToolNames().join(', ')}\n`);
  
  // Create test context
  const context: ToolContext = {
    workingDir: process.cwd(),
    config: {
      maxIterations: 10,
      sleepBetweenIterations: 1000,
      autoCommit: false,
      autoApprove: false,
      logLevel: 'debug',
      opencode: {
        streamOutput: true,
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
    } as AgentConfig,
    projectContext: {
      rootDir: process.cwd(),
      type: 'nodejs',
      structure: { directories: [], mainFiles: [], configFiles: [] },
      hasTests: false,
      hasDocker: false,
      conventions: {}
    } as ProjectContext
  };
  
  console.log('=== Test 1: write_file ===');
  const writeResult = await registry.execute(
    'write_file',
    {
      path: 'test-output.txt',
      content: 'Hello from Sheen tool system!\nThis is a test file.\n'
    },
    context
  );
  console.log('Result:', writeResult);
  console.log(writeResult.success ? '✓ PASS\n' : '✗ FAIL\n');
  
  console.log('=== Test 2: read_file ===');
  const readResult = await registry.execute(
    'read_file',
    {
      path: 'test-output.txt'
    },
    context
  );
  console.log('Result:', readResult);
  console.log(readResult.success ? '✓ PASS\n' : '✗ FAIL\n');
  
  console.log('=== Test 3: edit_file ===');
  const editResult = await registry.execute(
    'edit_file',
    {
      path: 'test-output.txt',
      search: 'Sheen',
      replace: 'SHEEN'
    },
    context
  );
  console.log('Result:', editResult);
  console.log(editResult.success ? '✓ PASS\n' : '✗ FAIL\n');
  
  console.log('=== Test 4: read_file (verify edit) ===');
  const readResult2 = await registry.execute(
    'read_file',
    {
      path: 'test-output.txt'
    },
    context
  );
  console.log('Content after edit:', readResult2.output);
  console.log(readResult2.success && readResult2.output?.includes('SHEEN') ? '✓ PASS\n' : '✗ FAIL\n');
  
  console.log('=== Test 5: list_files ===');
  const listResult = await registry.execute(
    'list_files',
    {
      path: '.',
      recursive: false
    },
    context
  );
  console.log('Files found:', (listResult.output as string[])?.length || 0);
  console.log(listResult.success ? '✓ PASS\n' : '✗ FAIL\n');
  
  console.log('=== Test 6: search_files ===');
  const searchResult = await registry.execute(
    'search_files',
    {
      pattern: 'ToolRegistry',
      path: 'src',
      filePattern: '*.ts'
    },
    context
  );
  console.log('Matches found:', (searchResult.output as any[])?.length || 0);
  console.log(searchResult.success ? '✓ PASS\n' : '✗ FAIL\n');
  
  console.log('=== Test 7: Invalid tool ===');
  const invalidResult = await registry.execute(
    'nonexistent_tool',
    {},
    context
  );
  console.log('Result:', invalidResult);
  console.log(!invalidResult.success ? '✓ PASS (correctly failed)\n' : '✗ FAIL\n');
  
  console.log('=== Test 8: Missing required parameter ===');
  const missingParamResult = await registry.execute(
    'write_file',
    { path: 'test.txt' }, // missing 'content'
    context
  );
  console.log('Result:', missingParamResult);
  console.log(!missingParamResult.success ? '✓ PASS (correctly failed)\n' : '✗ FAIL\n');
  
  console.log('=== All Tests Complete ===');
}

testTools().catch(console.error);
