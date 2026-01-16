#!/usr/bin/env node
/**
 * Quick test to verify OpenCode integration works without --continue flag
 */

import { spawn } from 'child_process';

console.log('Testing OpenCode integration without --continue flag...\n');

// Test 1: Check OpenCode is available
console.log('Test 1: Checking OpenCode availability...');
const versionProc = spawn('opencode', ['--version'], { shell: true });

versionProc.stdout.on('data', (data) => {
  console.log(`✓ OpenCode version: ${data.toString().trim()}`);
});

versionProc.on('close', (code) => {
  if (code === 0) {
    console.log('✓ OpenCode is available\n');
    runSimpleTest();
  } else {
    console.log('✗ OpenCode not available');
    process.exit(1);
  }
});

function runSimpleTest() {
  console.log('Test 2: Running simple OpenCode command (no --continue)...');
  console.log('Command: opencode run "What is 2+2? Just answer with the number."\n');
  
  const proc = spawn('opencode', ['run', 'What is 2+2? Just answer with the number.'], {
    shell: true,
    stdio: 'inherit'
  });

  proc.on('close', (code) => {
    console.log(`\nTest completed with exit code: ${code}`);
    if (code === 0) {
      console.log('✓ OpenCode executed successfully without errors');
    } else {
      console.log('✗ OpenCode failed');
    }
  });
}
