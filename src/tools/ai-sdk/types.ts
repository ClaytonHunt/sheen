/**
 * Types for AI SDK Tools
 * 
 * These types define the context and utilities available to tools.
 */

import type { ProjectContext, AgentConfig } from '../../utils/types';

/**
 * Context passed to tool execution
 */
export interface ToolContext {
  /** Working directory for the tool (usually project root) */
  workingDirectory: string;
  
  /** Project context information */
  projectContext: ProjectContext;
  
  /** Agent configuration */
  config: AgentConfig;
  
  /** Patterns to exclude from file operations */
  excludePatterns?: string[];
  
  /** Permission manager (to be implemented in Phase 4) */
  permissionManager?: any; // TODO: Replace with PermissionManager type
}
