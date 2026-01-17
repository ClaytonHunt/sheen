// Core domain types for Sheen

// ============================================================================
// Configuration Types
// ============================================================================

export interface AgentConfig {
  maxIterations: number;
  sleepBetweenIterations: number;
  autoCommit: boolean;
  autoApprove: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  // AI engine configuration (for v0.2.0)
  ai?: AIConfig;
  // Legacy OpenCode configuration (for v0.1.0 backward compatibility)
  opencode: OpenCodeConfig;
  tools: string[];
  excludePatterns: string[];
  phaseTimeouts: PhaseTimeouts;
  errorRecovery: ErrorRecoveryConfig;
}

export interface OpenCodeConfig {
  model?: string;
  agent?: string; // OpenCode agent to use (e.g., 'build', 'compaction', 'general')
  endpoint?: string;
  apiKey?: string;
  streamOutput: boolean;
  contextWindow: number;
  timeout?: number; // Timeout in milliseconds (default: 300000 = 5 minutes)
}

/**
 * AI SDK Configuration for Direct Provider Integration (v0.2.0)
 */
export interface AIConfig {
  // Engine selection
  engine: 'opencode' | 'direct-ai-sdk';
  
  // Provider settings (for direct-ai-sdk)
  provider: 'anthropic' | 'openai' | 'google' | 'github';
  model: string;
  apiKey?: string; // Falls back to environment variables (ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY, GITHUB_TOKEN)
  
  // Execution settings
  maxSteps: number; // AI SDK multi-step reasoning limit
  timeout: number;
  
  // Context management
  maxTokens: number;
  contextWindowSize: number;
  enablePruning: boolean;
  
  // Safety settings
  toolPermissions?: Record<string, 'allow' | 'deny' | 'ask'>;
}

export interface PhaseTimeouts {
  discovery: number;
  planning: number;
  implementation: number;
  validation: number;
}

export interface ErrorRecoveryConfig {
  maxOpenCodeErrors: number;
  maxTestRetries: number;
  maxNoProgress: number;
}

// ============================================================================
// Project Context Types
// ============================================================================

export type ProjectType = 'nodejs' | 'python' | 'go' | 'rust' | 'web' | 'unknown';
export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'pip' | 'poetry' | 'cargo';

export interface ProjectContext {
  rootDir: string;
  type: ProjectType;
  framework?: string;
  language?: string;
  packageManager?: PackageManager;
  structure: ProjectStructure;
  git?: GitInfo;
  hasTests: boolean;
  hasDocker: boolean;
  conventions: ProjectConventions;
}

export interface ProjectStructure {
  directories: string[];
  mainFiles: string[];
  configFiles: string[];
}

export interface GitInfo {
  initialized: boolean;
  remote?: string;
  branch?: string;
  hasUncommittedChanges: boolean;
}

export interface ProjectConventions {
  testFramework?: string;
  linter?: string;
  formatter?: string;
  commitStyle?: string;
}

// ============================================================================
// Task Types
// ============================================================================

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
export type TaskPriority = 'high' | 'medium' | 'low';
export type Phase = 'discovery' | 'planning' | 'implementation' | 'validation' | 'complete';

export interface Task {
  id: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  phase: Phase;
  dependencies?: string[];
  result?: TaskResult;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  attempts: number;
  errors?: TaskError[];
}

export interface TaskResult {
  success: boolean;
  output?: any;
  filesModified?: string[];
  commits?: string[];
}

export interface TaskError {
  message: string;
  code?: string;
  timestamp: Date;
  recoverable: boolean;
}

// ============================================================================
// Tool Types
// ============================================================================

export type ToolCategory = 'file' | 'git' | 'shell' | 'custom';

export interface Tool {
  name: string;
  description: string;
  category: ToolCategory;
  parameters: ToolParameter[];
  execute(params: Record<string, any>, context: ToolContext): Promise<ToolResult>;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: any;
}

export interface ToolContext {
  workingDir: string;
  config: AgentConfig;
  projectContext: ProjectContext;
}

export interface ToolResult {
  success: boolean;
  output?: any;
  error?: string;
  exitCode?: number;
  filesChanged?: string[];
}

// ============================================================================
// Execution State Types
// ============================================================================

export interface ExecutionState {
  iteration: number;
  phase: Phase;
  phaseIteration: number;
  currentTask?: Task;
  tasks: Task[];
  metrics: ProgressMetrics;
  errors: ExecutionError[];
  startedAt: Date;
  lastActivityAt: Date;
  paused: boolean;
  userMessages: UserMessage[];
  projectContext: ProjectContext;
}

export interface ProgressMetrics {
  testCount: number;
  fileCount: number;
  commitCount: number;
  lastCommitHash?: string;
  noProgressCount: number;
}

export interface ExecutionError {
  iteration: number;
  phase: Phase;
  error: Error;
  recovered: boolean;
  timestamp: Date;
}

export interface UserMessage {
  message: string;
  timestamp: Date;
  processed: boolean;
}

// ============================================================================
// OpenCode Types
// ============================================================================

export interface ConversationContext {
  projectContext: ProjectContext;
  currentTask?: Task;
  recentHistory: HistoryEntry[];
  availableTools: Tool[];
}

export interface OpenCodeResponse {
  toolCalls: ToolCall[];
  thinking?: string;
  nextAction?: string;
  phaseComplete?: boolean;
  phaseMarker?: string;
}

export interface ToolCall {
  tool: string;
  parameters: Record<string, any>;
  id: string;
}

export interface HistoryEntry {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: Date;
}

export interface ToolExecutionResult {
  toolCall: ToolCall;
  result: ToolResult;
  duration: number;
}

// ============================================================================
// Logger Types
// ============================================================================

export interface LogEntry {
  timestamp: Date;
  level: string;
  message: string;
  meta?: any;
}
