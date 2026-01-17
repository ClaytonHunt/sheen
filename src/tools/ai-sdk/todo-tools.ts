/**
 * Todo Tools - AI SDK Format
 * 
 * Task management tools for tracking implementation progress.
 */

import { tool } from 'ai';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { ToolContext } from './types.js';

export interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  created?: string;
  updated?: string;
}

/**
 * Read todos from .sheen/plan.md
 */
async function readTodos(workingDir: string): Promise<TodoItem[]> {
  const todoPath = path.join(workingDir, '.sheen', 'plan.md');
  
  try {
    const content = await fs.readFile(todoPath, 'utf-8');
    const todos: TodoItem[] = [];
    
    // Parse markdown format
    const lines = content.split('\n');
    let currentTodo: Partial<TodoItem> | null = null;
    
    for (const line of lines) {
      // Match task headers: ### Task task_id status
      const taskMatch = line.match(/^### Task (\S+) (.+)$/);
      if (taskMatch) {
        if (currentTodo && currentTodo.id) {
          todos.push(currentTodo as TodoItem);
        }
        
        const statusEmoji = taskMatch[2];
        let status: TodoItem['status'] = 'pending';
        if (statusEmoji.includes('✅')) status = 'completed';
        else if (statusEmoji.includes('🔄')) status = 'in_progress';
        else if (statusEmoji.includes('❌')) status = 'cancelled';
        
        currentTodo = {
          id: taskMatch[1],
          status
        };
      }
      
      // Match description
      const descMatch = line.match(/^\*\*Description\*\*: (.+)$/);
      if (descMatch && currentTodo) {
        currentTodo.content = descMatch[1];
      }
      
      // Match priority
      const priorityMatch = line.match(/^\*\*Priority\*\*: (\w+)$/);
      if (priorityMatch && currentTodo) {
        currentTodo.priority = priorityMatch[1].toLowerCase() as TodoItem['priority'];
      }
    }
    
    if (currentTodo && currentTodo.id) {
      todos.push(currentTodo as TodoItem);
    }
    
    return todos;
  } catch (error) {
    // If file doesn't exist, return empty array
    return [];
  }
}

/**
 * Write todos to .sheen/plan.md
 */
async function writeTodos(workingDir: string, todos: TodoItem[]): Promise<void> {
  const todoPath = path.join(workingDir, '.sheen', 'plan.md');
  
  // Ensure .sheen directory exists
  await fs.mkdir(path.dirname(todoPath), { recursive: true });
  
  // Generate markdown
  let markdown = `# Sheen Execution Plan\n\n`;
  markdown += `**Created**: ${new Date().toISOString()}\n`;
  markdown += `**Project**: nodejs (${workingDir})\n\n`;
  markdown += `## Tasks\n\n`;
  
  for (const todo of todos) {
    let emoji = '⏳';
    if (todo.status === 'completed') emoji = '✅';
    else if (todo.status === 'in_progress') emoji = '🔄';
    else if (todo.status === 'cancelled') emoji = '❌';
    
    markdown += `### Task ${todo.id} ${emoji}\n\n`;
    markdown += `**Description**: ${todo.content}\n`;
    markdown += `**Status**: ${todo.status}\n`;
    markdown += `**Priority**: ${todo.priority.toUpperCase()}\n`;
    markdown += `**Phase**: implementation\n`;
    markdown += `**Created**: ${todo.created || new Date().toISOString()}\n`;
    
    if (todo.status === 'in_progress' && !todo.updated) {
      markdown += `**Started**: ${new Date().toISOString()}\n`;
    }
    
    markdown += `\n`;
  }
  
  await fs.writeFile(todoPath, markdown, 'utf-8');
}

/**
 * Todo read tool - Read current todos
 */
export const todoReadTool = tool({
  description: 'Read the current todo list from .sheen/plan.md',
  parameters: z.object({}),
  
  // @ts-expect-error - AI SDK v6 tool types have compatibility issues with TypeScript strict mode
  execute: async ({}, context: ToolContext) => {
    try {
      const todos = await readTodos(context.workingDirectory);
      
      if (todos.length === 0) {
        return {
          success: true,
          message: 'No todos found',
          todos: []
        };
      }
      
      const summary = {
        total: todos.length,
        pending: todos.filter(t => t.status === 'pending').length,
        in_progress: todos.filter(t => t.status === 'in_progress').length,
        completed: todos.filter(t => t.status === 'completed').length,
        cancelled: todos.filter(t => t.status === 'cancelled').length
      };
      
      return {
        success: true,
        todos,
        summary
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});

/**
 * Todo write tool - Update todos
 */
export const todoWriteTool = tool({
  description: 'Update the todo list in .sheen/plan.md. Provide complete list of todos.',
  parameters: z.object({
    todos: z.array(z.object({
      id: z.string().describe('Unique task ID'),
      content: z.string().describe('Task description'),
      status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).describe('Task status'),
      priority: z.enum(['high', 'medium', 'low']).describe('Task priority')
    })).describe('Complete list of todos')
  }),
  
  // @ts-expect-error - AI SDK v6 tool types have compatibility issues with TypeScript strict mode
  execute: async ({ todos }: { todos: TodoItem[] }, context: ToolContext) => {
    try {
      await writeTodos(context.workingDirectory, todos);
      
      const summary = {
        total: todos.length,
        pending: todos.filter(t => t.status === 'pending').length,
        in_progress: todos.filter(t => t.status === 'in_progress').length,
        completed: todos.filter(t => t.status === 'completed').length,
        cancelled: todos.filter(t => t.status === 'cancelled').length
      };
      
      return {
        success: true,
        message: `Updated ${todos.length} todos`,
        summary
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});
