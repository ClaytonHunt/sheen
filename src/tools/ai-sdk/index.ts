/**
 * AI SDK Tool Registry
 * 
 * Central registry for all tools in AI SDK format.
 * These tools are used by DirectAIAgent for native tool calling.
 */

import { bashTool } from './bash-tool.js';
import { readTool } from './read-tool.js';
import { writeTool } from './write-tool.js';
import { editTool } from './edit-tool.js';
import { grepTool } from './grep-tool.js';
import { globTool } from './glob-tool.js';
import { gitStatusTool, gitDiffTool, gitCommitTool } from './git-tools.js';
import { todoReadTool, todoWriteTool } from './todo-tools.js';

/**
 * All tools organized by category
 */
export const toolsByCategory = {
  shell: {
    bash: bashTool
  },
  file: {
    read: readTool,
    write: writeTool,
    edit: editTool,
    grep: grepTool,
    glob: globTool
  },
  git: {
    git_status: gitStatusTool,
    git_diff: gitDiffTool,
    git_commit: gitCommitTool
  },
  task: {
    todoread: todoReadTool,
    todowrite: todoWriteTool
  }
};

/**
 * All tools as a flat object (for AI SDK)
 */
export const allTools = {
  // Shell
  bash: bashTool,
  
  // File operations
  read: readTool,
  write: writeTool,
  edit: editTool,
  grep: grepTool,
  glob: globTool,
  
  // Git operations
  git_status: gitStatusTool,
  git_diff: gitDiffTool,
  git_commit: gitCommitTool,
  
  // Task management
  todoread: todoReadTool,
  todowrite: todoWriteTool
};

/**
 * Get tools by category
 */
export function getToolsByCategory(category: keyof typeof toolsByCategory) {
  return toolsByCategory[category];
}

/**
 * Get all tool names
 */
export function getAllToolNames(): string[] {
  return Object.keys(allTools);
}

/**
 * Tool count by category
 */
export const toolCounts = {
  shell: 1,
  file: 5,
  git: 3,
  task: 2,
  total: 11
};

// Export individual tools for convenience
export {
  bashTool,
  readTool,
  writeTool,
  editTool,
  grepTool,
  globTool,
  gitStatusTool,
  gitDiffTool,
  gitCommitTool,
  todoReadTool,
  todoWriteTool
};
