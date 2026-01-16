import * as fs from 'fs/promises';
import * as path from 'path';
import { Task, TaskStatus, TaskPriority, Phase, ProjectContext, ExecutionState } from '../utils/types.js';
import { logger } from '../utils/logger.js';

/**
 * Task planner and manager
 * 
 * Handles task creation, status tracking, and persistence to .sheen/plan.md
 * For MVP: Simple in-memory task queue with single task support
 */
export class TaskPlanner {
  private tasks: Task[] = [];
  private planPath: string;
  private projectContext: ProjectContext;

  constructor(projectContext: ProjectContext) {
    this.projectContext = projectContext;
    this.planPath = path.join(projectContext.rootDir, '.sheen', 'plan.md');
  }

  /**
   * Create initial plan from user prompt
   * For MVP: Creates a single task from the prompt
   */
  async createPlan(prompt: string): Promise<Task[]> {
    logger.debug('Creating plan from prompt', { prompt });

    // Create single task for MVP
    const task: Task = {
      id: this.generateTaskId(),
      description: prompt,
      status: 'pending',
      priority: 'high',
      phase: 'implementation',
      createdAt: new Date(),
      attempts: 0
    };

    this.tasks = [task];
    
    // Persist to plan.md
    await this.savePlan();
    
    logger.info(`Plan created with ${this.tasks.length} task(s)`);
    return this.tasks;
  }

  /**
   * Get next pending task to execute
   */
  async getNextTask(state: ExecutionState): Promise<Task | null> {
    // Find first pending task
    const task = this.tasks.find(t => t.status === 'pending');
    
    if (task) {
      logger.debug(`Next task: ${task.id} - ${task.description}`);
    } else {
      logger.debug('No pending tasks found');
    }
    
    return task || null;
  }

  /**
   * Update task status and details
   */
  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const taskIndex = this.tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) {
      logger.warn(`Task not found: ${taskId}`);
      return;
    }

    // Update task
    this.tasks[taskIndex] = {
      ...this.tasks[taskIndex],
      ...updates
    };

    // Track status changes
    if (updates.status) {
      logger.info(`Task ${taskId} status: ${updates.status}`);
      
      if (updates.status === 'in_progress' && !this.tasks[taskIndex].startedAt) {
        this.tasks[taskIndex].startedAt = new Date();
      } else if (updates.status === 'completed' && !this.tasks[taskIndex].completedAt) {
        this.tasks[taskIndex].completedAt = new Date();
      }
    }

    // Persist changes
    await this.savePlan();
  }

  /**
   * Add new task to the plan
   */
  async addTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
    const newTask: Task = {
      ...task,
      id: this.generateTaskId(),
      createdAt: new Date()
    };

    this.tasks.push(newTask);
    await this.savePlan();
    
    logger.info(`Added task: ${newTask.id} - ${newTask.description}`);
    return newTask;
  }

  /**
   * Get all tasks
   */
  getTasks(): Task[] {
    return [...this.tasks];
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.find(t => t.id === taskId);
  }

  /**
   * Save plan to .sheen/plan.md
   */
  async savePlan(): Promise<void> {
    try {
      const content = this.generatePlanMarkdown();
      
      // Ensure .sheen directory exists
      const sheenDir = path.dirname(this.planPath);
      await fs.mkdir(sheenDir, { recursive: true });
      
      await fs.writeFile(this.planPath, content, 'utf-8');
      logger.debug('Plan saved to .sheen/plan.md');
    } catch (error) {
      logger.error('Failed to save plan', error as Error);
    }
  }

  /**
   * Load plan from .sheen/plan.md
   */
  async loadPlan(): Promise<Task[]> {
    try {
      const content = await fs.readFile(this.planPath, 'utf-8');
      this.tasks = this.parsePlanMarkdown(content);
      
      logger.info(`Loaded plan with ${this.tasks.length} task(s)`);
      return this.tasks;
    } catch (error) {
      logger.warn('Failed to load plan, starting with empty task list');
      this.tasks = [];
      return this.tasks;
    }
  }

  /**
   * Check if plan file exists
   */
  async planExists(): Promise<boolean> {
    try {
      await fs.access(this.planPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate markdown content for plan
   */
  private generatePlanMarkdown(): string {
    const lines: string[] = [];
    
    lines.push('# Sheen Execution Plan');
    lines.push('');
    lines.push(`**Created**: ${new Date().toISOString()}`);
    lines.push(`**Project**: ${this.projectContext.type} (${this.projectContext.rootDir})`);
    lines.push('');
    lines.push('## Tasks');
    lines.push('');

    if (this.tasks.length === 0) {
      lines.push('*No tasks yet*');
    } else {
      for (const task of this.tasks) {
        const statusIcon = this.getStatusIcon(task.status);
        const priorityLabel = task.priority.toUpperCase();
        
        lines.push(`### Task ${task.id} ${statusIcon}`);
        lines.push('');
        lines.push(`**Description**: ${task.description}`);
        lines.push(`**Status**: ${task.status}`);
        lines.push(`**Priority**: ${priorityLabel}`);
        lines.push(`**Phase**: ${task.phase}`);
        lines.push(`**Created**: ${task.createdAt.toISOString()}`);
        
        if (task.startedAt) {
          lines.push(`**Started**: ${task.startedAt.toISOString()}`);
        }
        
        if (task.completedAt) {
          lines.push(`**Completed**: ${task.completedAt.toISOString()}`);
        }
        
        if (task.result) {
          lines.push('');
          lines.push('**Result**:');
          lines.push(`- Success: ${task.result.success}`);
          if (task.result.filesModified) {
            lines.push(`- Files Modified: ${task.result.filesModified.length}`);
          }
          if (task.result.commits) {
            lines.push(`- Commits: ${task.result.commits.length}`);
          }
        }
        
        if (task.errors && task.errors.length > 0) {
          lines.push('');
          lines.push('**Errors**:');
          for (const error of task.errors) {
            lines.push(`- ${error.message} (${error.timestamp.toISOString()})`);
          }
        }
        
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Parse plan markdown to extract tasks
   * Parses the markdown format generated by generatePlanMarkdown()
   */
  private parsePlanMarkdown(content: string): Task[] {
    const tasks: Task[] = [];
    
    // Split by task headers (### Task task_id)
    const taskBlocks = content.split(/### Task /g).slice(1); // Skip first (header section)
    
    for (const block of taskBlocks) {
      try {
        const lines = block.split('\n');
        
        // Parse task ID from first line (e.g., "task_123 ✅")
        const firstLine = lines[0].trim();
        const idMatch = firstLine.match(/^(\S+)/);
        if (!idMatch) continue;
        
        const task: Partial<Task> = {
          id: idMatch[1],
          attempts: 0
        };
        
        // Parse fields from markdown
        for (const line of lines) {
          const trimmed = line.trim();
          
          if (trimmed.startsWith('**Description**:')) {
            task.description = trimmed.replace('**Description**:', '').trim();
          } else if (trimmed.startsWith('**Status**:')) {
            const status = trimmed.replace('**Status**:', '').trim();
            task.status = status as TaskStatus;
          } else if (trimmed.startsWith('**Priority**:')) {
            const priority = trimmed.replace('**Priority**:', '').trim().toLowerCase();
            task.priority = priority as TaskPriority;
          } else if (trimmed.startsWith('**Phase**:')) {
            const phase = trimmed.replace('**Phase**:', '').trim();
            task.phase = phase as Phase;
          } else if (trimmed.startsWith('**Created**:')) {
            const dateStr = trimmed.replace('**Created**:', '').trim();
            task.createdAt = new Date(dateStr);
          } else if (trimmed.startsWith('**Started**:')) {
            const dateStr = trimmed.replace('**Started**:', '').trim();
            task.startedAt = new Date(dateStr);
          } else if (trimmed.startsWith('**Completed**:')) {
            const dateStr = trimmed.replace('**Completed**:', '').trim();
            task.completedAt = new Date(dateStr);
          }
        }
        
        // Only add if we have required fields
        if (task.id && task.description && task.status && task.priority && task.phase && task.createdAt) {
          tasks.push(task as Task);
        } else {
          logger.warn(`Skipping incomplete task: ${task.id || 'unknown'}`);
        }
      } catch (error) {
        logger.warn('Failed to parse task block', error as Error);
      }
    }
    
    return tasks;
  }

  /**
   * Get status icon for markdown
   */
  private getStatusIcon(status: TaskStatus): string {
    switch (status) {
      case 'completed': return '✅';
      case 'in_progress': return '🔄';
      case 'failed': return '❌';
      case 'skipped': return '⏭️';
      case 'pending': return '⏳';
      default: return '❓';
    }
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `task_${timestamp}_${random}`;
  }
}
