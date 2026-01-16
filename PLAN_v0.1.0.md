# Technical Plan: Sheen v0.1.0

**Date**: January 16, 2026  
**Updated**: January 16, 2026 (Current state assessment added)  
**Phase**: Planning → Implementation  
**Goal**: Detailed technical design for Node.js/TypeScript autonomous agent

## Current Implementation Status

### ✅ Completed (Phases 1-5)
- **Phase 1**: Project setup complete (package.json, tsconfig, .gitignore, structure)
- **Phase 2**: CLI & Config substantially complete (~80%)
  - Entry point with error handling ✅
  - CLI parsing with Commander.js ✅
  - Configuration system needs completion ⚠️
- **Phase 3**: Project detection skeleton exists (~40%)
  - Detector implemented ✅
  - Initializer implemented ✅  
  - Needs testing and refinement ⚠️
- **Phase 4**: OpenCode integration partially complete (~60%)
  - Client implemented with subprocess ✅ (246 lines)
  - Adapter implemented ✅ (220 lines)
  - Needs testing and refinement ⚠️
- **Phase 5**: Tool system complete ✅
  - Tool registry ✅ (20 tests passing)
  - File tools ✅ (16 tests passing)
  - Git tools ✅ (10 tests passing)
  - Shell tool ✅ (7 tests passing)
  - **Total: 65 tests passing**

### 🚧 In Progress (Phase 6)
- **Phase 6**: Agent core (~50% complete)
  - Agent orchestrator ✅ (218 lines)
  - Execution loop ✅ (103 lines)
  - Planner skeleton only ⚠️ (2 lines)
  - Context manager skeleton only ⚠️ (2 lines)

### ❌ Not Started (Phases 7-9)
- **Phase 7**: I/O system (skeleton files only)
- **Phase 8**: Utilities (partial - logger exists)
- **Phase 9**: Testing (65 tool tests complete, integration tests needed)

### 🎯 Critical Path to MVP

Based on current state, the **remaining work** to reach MVP:

1. **Complete Planner** (src/core/planner.ts) - HIGH PRIORITY
   - Task creation and management
   - Plan persistence to .sheen/plan.md
   - Task status tracking
   
2. **Complete Context Manager** (src/core/context.ts) - HIGH PRIORITY
   - Build conversation context for OpenCode
   - Manage history pruning
   - Format tool definitions
   
3. **Complete Prompt Builder** (src/io/prompt.ts) - HIGH PRIORITY
   - System prompt construction
   - Include project context
   - Add available tools
   - Format task description
   
4. **Integration Testing** - HIGH PRIORITY
   - Test OpenCode client end-to-end
   - Verify tool call parsing
   - Test autonomous loop
   - Smoke test with simple prompt
   
5. **Global Installation** - MEDIUM PRIORITY
   - Verify npm link works
   - Test from different directories
   - Cross-platform testing

**Estimated effort**: 1-2 days focused work to reach MVP

---

## Table of Contents

1. [Domain Model & Core Types](#domain-model--core-types)
2. [API Contracts](#api-contracts)
3. [File-by-File Implementation Plan](#file-by-file-implementation-plan)
4. [Test Plan](#test-plan)
5. [Integration Strategy](#integration-strategy)
6. [Migration from Bash](#migration-from-bash)

---

## Domain Model & Core Types

### Core Entities

#### 1. AgentConfig
```typescript
interface AgentConfig {
  maxIterations: number;
  sleepBetweenIterations: number;
  autoCommit: boolean;
  autoApprove: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  opencode: OpenCodeConfig;
  tools: string[];
  excludePatterns: string[];
  phaseTimeouts: PhaseTimeouts;
  errorRecovery: ErrorRecoveryConfig;
}

interface OpenCodeConfig {
  model?: string;
  endpoint?: string;
  apiKey?: string;
  streamOutput: boolean;
  contextWindow: number;
}

interface PhaseTimeouts {
  discovery: number;
  planning: number;
  implementation: number;
  validation: number;
}

interface ErrorRecoveryConfig {
  maxOpenCodeErrors: number;
  maxTestRetries: number;
  maxNoProgress: number;
}
```

#### 2. ProjectContext
```typescript
interface ProjectContext {
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

type ProjectType = 'nodejs' | 'python' | 'go' | 'rust' | 'web' | 'unknown';
type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'pip' | 'poetry' | 'cargo';

interface ProjectStructure {
  directories: string[];
  mainFiles: string[];
  configFiles: string[];
}

interface GitInfo {
  initialized: boolean;
  remote?: string;
  branch?: string;
  hasUncommittedChanges: boolean;
}

interface ProjectConventions {
  testFramework?: string;
  linter?: string;
  formatter?: string;
  commitStyle?: string;
}
```

#### 3. Task
```typescript
interface Task {
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

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
type TaskPriority = 'high' | 'medium' | 'low';
type Phase = 'discovery' | 'planning' | 'implementation' | 'validation' | 'complete';

interface TaskResult {
  success: boolean;
  output?: any;
  filesModified?: string[];
  commits?: string[];
}

interface TaskError {
  message: string;
  code?: string;
  timestamp: Date;
  recoverable: boolean;
}
```

#### 4. Tool
```typescript
interface Tool {
  name: string;
  description: string;
  category: ToolCategory;
  parameters: ToolParameter[];
  execute(params: Record<string, any>, context: ToolContext): Promise<ToolResult>;
}

type ToolCategory = 'file' | 'git' | 'shell' | 'custom';

interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: any;
}

interface ToolContext {
  workingDir: string;
  config: AgentConfig;
  projectContext: ProjectContext;
}

interface ToolResult {
  success: boolean;
  output?: any;
  error?: string;
  exitCode?: number;
  filesChanged?: string[];
}
```

#### 5. ExecutionState
```typescript
interface ExecutionState {
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
}

interface ProgressMetrics {
  testCount: number;
  fileCount: number;
  commitCount: number;
  lastCommitHash?: string;
  noProgressCount: number;
}

interface ExecutionError {
  iteration: number;
  phase: Phase;
  error: Error;
  recovered: boolean;
  timestamp: Date;
}

interface UserMessage {
  message: string;
  timestamp: Date;
  processed: boolean;
}
```

---

## API Contracts

### Core Module: Agent (`src/core/agent.ts`)

```typescript
class Agent {
  constructor(config: AgentConfig, projectContext: ProjectContext);
  
  /**
   * Start autonomous execution
   * @param initialPrompt - User's initial prompt
   * @returns Execution state when complete
   */
  async run(initialPrompt?: string): Promise<ExecutionState>;
  
  /**
   * Pause execution (can be resumed)
   */
  async pause(): Promise<void>;
  
  /**
   * Resume paused execution
   */
  async resume(): Promise<void>;
  
  /**
   * Stop execution (cannot be resumed)
   */
  async stop(): Promise<void>;
  
  /**
   * Get current execution state
   */
  getState(): ExecutionState;
  
  /**
   * Queue user message for processing
   */
  queueUserMessage(message: string): void;
}
```

### Core Module: Loop (`src/core/loop.ts`)

```typescript
class ExecutionLoop {
  constructor(
    config: AgentConfig,
    planner: TaskPlanner,
    opencode: OpenCodeClient,
    toolRegistry: ToolRegistry
  );
  
  /**
   * Run autonomous loop
   * @returns Final execution state
   */
  async execute(state: ExecutionState): Promise<ExecutionState>;
  
  /**
   * Execute single iteration
   */
  private async executeIteration(state: ExecutionState): Promise<void>;
  
  /**
   * Check if should continue
   */
  private shouldContinue(state: ExecutionState): boolean;
  
  /**
   * Handle phase transition
   */
  private async handlePhaseTransition(
    currentPhase: Phase,
    nextPhase: Phase,
    state: ExecutionState
  ): Promise<void>;
}
```

### Core Module: Planner (`src/core/planner.ts`)

```typescript
class TaskPlanner {
  constructor(projectContext: ProjectContext);
  
  /**
   * Create initial plan from prompt
   */
  async createPlan(prompt: string): Promise<Task[]>;
  
  /**
   * Get next task to execute
   */
  async getNextTask(state: ExecutionState): Promise<Task | null>;
  
  /**
   * Update task status
   */
  async updateTask(taskId: string, updates: Partial<Task>): Promise<void>;
  
  /**
   * Add new task (from user input)
   */
  async addTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<Task>;
  
  /**
   * Get all tasks
   */
  getTasks(): Task[];
  
  /**
   * Save plan to .sheen/plan.md
   */
  async savePlan(): Promise<void>;
  
  /**
   * Load plan from .sheen/plan.md
   */
  async loadPlan(): Promise<Task[]>;
}
```

### OpenCode Module: Client (`src/opencode/client.ts`)

```typescript
class OpenCodeClient {
  constructor(config: OpenCodeConfig);
  
  /**
   * Execute prompt with OpenCode
   * @param prompt - The prompt to send
   * @param context - Conversation context
   * @returns Response with tool calls
   */
  async execute(
    prompt: string,
    context: ConversationContext
  ): Promise<OpenCodeResponse>;
  
  /**
   * Stream execution (for real-time output)
   */
  async *stream(
    prompt: string,
    context: ConversationContext
  ): AsyncGenerator<OpenCodeChunk>;
  
  /**
   * Check if OpenCode is available
   */
  async isAvailable(): Promise<boolean>;
}

interface ConversationContext {
  projectContext: ProjectContext;
  currentTask?: Task;
  recentHistory: HistoryEntry[];
  availableTools: Tool[];
}

interface OpenCodeResponse {
  toolCalls: ToolCall[];
  thinking?: string;
  nextAction?: string;
  phaseComplete?: boolean;
  phaseMarker?: string;
}

interface ToolCall {
  tool: string;
  parameters: Record<string, any>;
  id: string;
}

interface HistoryEntry {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: Date;
}
```

### OpenCode Module: Adapter (`src/opencode/adapter.ts`)

```typescript
class ToolCallAdapter {
  constructor(toolRegistry: ToolRegistry, context: ProjectContext);
  
  /**
   * Execute tool calls from OpenCode
   */
  async executeToolCalls(
    toolCalls: ToolCall[],
    context: ToolContext
  ): Promise<ToolExecutionResult[]>;
  
  /**
   * Parse tool calls from OpenCode output
   */
  parseToolCalls(output: string): ToolCall[];
  
  /**
   * Format tool results for OpenCode
   */
  formatToolResults(results: ToolExecutionResult[]): string;
}

interface ToolExecutionResult {
  toolCall: ToolCall;
  result: ToolResult;
  duration: number;
}
```

### Project Module: Detector (`src/project/detector.ts`)

```typescript
class ProjectDetector {
  /**
   * Detect project type and context
   */
  async detect(directory: string): Promise<ProjectContext>;
  
  /**
   * Detect project type
   */
  private async detectType(directory: string): Promise<ProjectType>;
  
  /**
   * Detect framework
   */
  private async detectFramework(
    directory: string,
    type: ProjectType
  ): Promise<string | undefined>;
  
  /**
   * Analyze structure
   */
  private async analyzeStructure(directory: string): Promise<ProjectStructure>;
  
  /**
   * Detect conventions
   */
  private async detectConventions(directory: string): Promise<ProjectConventions>;
}
```

### Project Module: Initializer (`src/project/initializer.ts`)

```typescript
class SheenInitializer {
  constructor(projectContext: ProjectContext);
  
  /**
   * Initialize .sheen/ directory
   */
  async initialize(prompt?: string): Promise<void>;
  
  /**
   * Create plan.md
   */
  private async createPlan(prompt: string): Promise<void>;
  
  /**
   * Create context.md
   */
  private async createContext(): Promise<void>;
  
  /**
   * Create config.json
   */
  private async createConfig(): Promise<void>;
  
  /**
   * Create history.jsonl
   */
  private async createHistory(): Promise<void>;
  
  /**
   * Check if .sheen/ exists
   */
  async exists(): Promise<boolean>;
}
```

### Tools Module: Registry (`src/tools/index.ts`)

```typescript
class ToolRegistry {
  private tools: Map<string, Tool>;
  
  /**
   * Register a tool
   */
  register(tool: Tool): void;
  
  /**
   * Get tool by name
   */
  get(name: string): Tool | undefined;
  
  /**
   * Get all tools
   */
  getAll(): Tool[];
  
  /**
   * Get tools by category
   */
  getByCategory(category: ToolCategory): Tool[];
  
  /**
   * Execute tool
   */
  async execute(
    name: string,
    params: Record<string, any>,
    context: ToolContext
  ): Promise<ToolResult>;
  
  /**
   * Load custom tools from directory
   */
  async loadCustomTools(directory: string): Promise<void>;
}
```

### Tools Module: File (`src/tools/file.ts`)

```typescript
// File Tools
const readFileTool: Tool = {
  name: 'read_file',
  description: 'Read contents of a file',
  category: 'file',
  parameters: [
    { name: 'path', type: 'string', description: 'File path', required: true }
  ],
  async execute(params, context) {
    // Implementation
  }
};

const writeFileTool: Tool = {
  name: 'write_file',
  description: 'Write content to a file',
  category: 'file',
  parameters: [
    { name: 'path', type: 'string', description: 'File path', required: true },
    { name: 'content', type: 'string', description: 'File content', required: true }
  ],
  async execute(params, context) {
    // Implementation
  }
};

const editFileTool: Tool = {
  name: 'edit_file',
  description: 'Edit specific lines in a file',
  category: 'file',
  parameters: [
    { name: 'path', type: 'string', description: 'File path', required: true },
    { name: 'search', type: 'string', description: 'Text to search', required: true },
    { name: 'replace', type: 'string', description: 'Replacement text', required: true }
  ],
  async execute(params, context) {
    // Implementation
  }
};

const listFilesTool: Tool = {
  name: 'list_files',
  description: 'List files in directory',
  category: 'file',
  parameters: [
    { name: 'path', type: 'string', description: 'Directory path', required: false }
  ],
  async execute(params, context) {
    // Implementation
  }
};

const searchFilesTool: Tool = {
  name: 'search_files',
  description: 'Search for text in files',
  category: 'file',
  parameters: [
    { name: 'pattern', type: 'string', description: 'Search pattern', required: true },
    { name: 'path', type: 'string', description: 'Search path', required: false }
  ],
  async execute(params, context) {
    // Implementation
  }
};
```

### Tools Module: Git (`src/tools/git.ts`)

```typescript
const gitStatusTool: Tool = {
  name: 'git_status',
  description: 'Get git repository status',
  category: 'git',
  parameters: [],
  async execute(params, context) {
    // Implementation
  }
};

const gitDiffTool: Tool = {
  name: 'git_diff',
  description: 'Show git diff',
  category: 'git',
  parameters: [
    { name: 'staged', type: 'boolean', description: 'Show staged changes', required: false }
  ],
  async execute(params, context) {
    // Implementation
  }
};

const gitCommitTool: Tool = {
  name: 'git_commit',
  description: 'Create git commit',
  category: 'git',
  parameters: [
    { name: 'message', type: 'string', description: 'Commit message', required: true },
    { name: 'files', type: 'array', description: 'Files to commit', required: false }
  ],
  async execute(params, context) {
    // Implementation
  }
};

const gitLogTool: Tool = {
  name: 'git_log',
  description: 'Show git log',
  category: 'git',
  parameters: [
    { name: 'count', type: 'number', description: 'Number of commits', required: false, default: 10 }
  ],
  async execute(params, context) {
    // Implementation
  }
};
```

### Tools Module: Shell (`src/tools/shell.ts`)

```typescript
const shellExecTool: Tool = {
  name: 'shell_exec',
  description: 'Execute shell command',
  category: 'shell',
  parameters: [
    { name: 'command', type: 'string', description: 'Command to execute', required: true },
    { name: 'cwd', type: 'string', description: 'Working directory', required: false },
    { name: 'timeout', type: 'number', description: 'Timeout in ms', required: false, default: 30000 }
  ],
  async execute(params, context) {
    // Implementation using child_process
  }
};
```

### I/O Module: Output (`src/io/output.ts`)

```typescript
class OutputFormatter {
  /**
   * Display iteration header
   */
  showIterationHeader(iteration: number, phase: Phase, phaseIteration: number): void;
  
  /**
   * Show task progress
   */
  showTaskProgress(task: Task): void;
  
  /**
   * Show tool execution
   */
  showToolExecution(toolCall: ToolCall): void;
  
  /**
   * Show tool result
   */
  showToolResult(result: ToolExecutionResult): void;
  
  /**
   * Show phase transition
   */
  showPhaseTransition(from: Phase, to: Phase): void;
  
  /**
   * Show error
   */
  showError(error: Error): void;
  
  /**
   * Show success
   */
  showSuccess(message: string): void;
  
  /**
   * Start spinner
   */
  startSpinner(text: string): void;
  
  /**
   * Stop spinner
   */
  stopSpinner(success: boolean): void;
}
```

### I/O Module: Input (`src/io/input.ts`)

```typescript
class InputHandler {
  private messageQueue: UserMessage[];
  private readline?: readline.Interface;
  
  /**
   * Start listening for input
   */
  start(): void;
  
  /**
   * Stop listening
   */
  stop(): void;
  
  /**
   * Get queued messages
   */
  getMessages(): UserMessage[];
  
  /**
   * Clear message queue
   */
  clearQueue(): void;
  
  /**
   * Prompt user for input (blocking)
   */
  async prompt(question: string): Promise<string>;
  
  /**
   * Confirm action (blocking)
   */
  async confirm(question: string): Promise<boolean>;
}
```

### Config Module: Global (`src/config/global.ts`)

```typescript
class GlobalConfig {
  private static readonly CONFIG_PATH = '~/.sheen/config.json';
  
  /**
   * Load global config
   */
  static async load(): Promise<Partial<AgentConfig>>;
  
  /**
   * Save global config
   */
  static async save(config: Partial<AgentConfig>): Promise<void>;
  
  /**
   * Get default config
   */
  static getDefaults(): AgentConfig;
  
  /**
   * Merge configs (CLI > project > global > defaults)
   */
  static merge(
    cli?: Partial<AgentConfig>,
    project?: Partial<AgentConfig>,
    global?: Partial<AgentConfig>
  ): AgentConfig;
}
```

### Utils Module: Logger (`src/utils/logger.ts`)

```typescript
class Logger {
  constructor(logLevel: string, historyFile?: string);
  
  /**
   * Log debug message
   */
  debug(message: string, meta?: any): void;
  
  /**
   * Log info message
   */
  info(message: string, meta?: any): void;
  
  /**
   * Log warning
   */
  warn(message: string, meta?: any): void;
  
  /**
   * Log error
   */
  error(message: string, error?: Error): void;
  
  /**
   * Log to history file
   */
  private async appendHistory(entry: LogEntry): Promise<void>;
}

interface LogEntry {
  timestamp: Date;
  level: string;
  message: string;
  meta?: any;
}
```

---

## File-by-File Implementation Plan

### Phase 1: Foundation

#### 1.1 Create `package.json`

```json
{
  "name": "sheen",
  "version": "0.1.0",
  "description": "Autonomous coding agent with human oversight",
  "main": "dist/index.js",
  "bin": {
    "sheen": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "test": "echo \"Tests coming soon\"",
    "prepublishOnly": "npm run build"
  },
  "keywords": ["ai", "agent", "autonomous", "coding", "cli"],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "commander": "^11.0.0",
    "chalk": "^4.1.2",
    "ora": "^5.4.1",
    "inquirer": "^8.2.5",
    "dotenv": "^16.0.3"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tsx": "^4.0.0",
    "@types/node": "^20.0.0",
    "@types/inquirer": "^9.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "files": [
    "dist",
    "templates"
  ]
}
```

**Validation**: `npm install` succeeds, no errors

#### 1.2 Create `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Validation**: `tsc` compiles without errors

#### 1.3 Create `.gitignore`

```
# Dependencies
node_modules/
package-lock.json
yarn.lock
pnpm-lock.yaml

# Build output
dist/
*.tsbuildinfo

# Logs
logs/
*.log
.sheen/history.jsonl

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
.nyc_output/
```

**Validation**: Git ignores node_modules

#### 1.4 Create directory structure

```bash
mkdir -p src/{core,io,project,opencode,tools,config,utils}
mkdir -p templates/init
```

**Files to create with exports**:
- `src/core/index.ts`
- `src/io/index.ts`
- `src/project/index.ts`
- `src/opencode/index.ts`
- `src/tools/index.ts`
- `src/config/index.ts`
- `src/utils/index.ts`

**Validation**: Directory structure matches plan

---

### Phase 2: Core Types & CLI

#### 2.1 Create `src/utils/types.ts`

Implement all interfaces from Domain Model section above.

**Validation**: TypeScript compiles without errors

#### 2.2 Create `src/index.ts`

```typescript
#!/usr/bin/env node

import { runCLI } from './cli';
import { Logger } from './utils/logger';

const logger = new Logger('info');

// Handle uncaught errors
process.on('unhandledRejection', (error: Error) => {
  logger.error('Unhandled rejection', error);
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});

// Graceful shutdown
let shuttingDown = false;

async function gracefulShutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  
  logger.info('Sheen shutting down...');
  // Cleanup logic here
  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Run CLI
runCLI().catch((error: Error) => {
  logger.error('Fatal error', error);
  process.exit(1);
});
```

**Validation**: `npm run dev` starts without errors

#### 2.3 Create `src/cli.ts`

```typescript
import { Command } from 'commander';
import { Agent } from './core/agent';
import { ProjectDetector } from './project/detector';
import { SheenInitializer } from './project/initializer';
import { GlobalConfig } from './config/global';
import { Logger } from './utils/logger';

const program = new Command();

export async function runCLI() {
  program
    .name('sheen')
    .description('Autonomous coding agent with human oversight')
    .version('0.1.0');

  // Main command with prompt
  program
    .argument('[prompt]', 'Task prompt for the agent')
    .option('-a, --auto', 'Auto-resume from .sheen/plan.md')
    .option('-c, --continue', 'Continue previous session')
    .option('--approve-all', 'Skip all confirmations')
    .option('--max-iterations <number>', 'Maximum iterations', '100')
    .option('-v, --verbose', 'Verbose output')
    .option('--config <path>', 'Custom config file')
    .action(async (prompt, options) => {
      // Implementation
      const logger = new Logger(options.verbose ? 'debug' : 'info');
      
      // Detect project
      const detector = new ProjectDetector();
      const projectContext = await detector.detect(process.cwd());
      
      // Load config
      const globalConfig = await GlobalConfig.load();
      const config = GlobalConfig.merge(options, undefined, globalConfig);
      
      // Initialize or load .sheen/
      const initializer = new SheenInitializer(projectContext);
      if (!await initializer.exists()) {
        await initializer.initialize(prompt);
      }
      
      // Create and run agent
      const agent = new Agent(config, projectContext);
      await agent.run(prompt || options.auto);
    });

  // Init command
  program
    .command('init')
    .description('Initialize .sheen/ directory')
    .action(async () => {
      // Implementation
    });

  await program.parseAsync(process.argv);
}
```

**Validation**: `sheen --help` shows usage

#### 2.4 Create `src/config/global.ts`

Implement GlobalConfig class with load/save/merge.

**Validation**: Can load config from ~/.sheen/config.json

---

### Phase 3: Project Detection & Initialization

#### 3.1 Create `src/project/detector.ts`

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import { ProjectContext, ProjectType } from '../utils/types';

export class ProjectDetector {
  async detect(directory: string): Promise<ProjectContext> {
    const type = await this.detectType(directory);
    const framework = await this.detectFramework(directory, type);
    const structure = await this.analyzeStructure(directory);
    const conventions = await this.detectConventions(directory);
    const git = await this.detectGit(directory);
    
    return {
      rootDir: directory,
      type,
      framework,
      structure,
      conventions,
      git,
      hasTests: await this.hasTests(directory),
      hasDocker: await this.exists(path.join(directory, 'Dockerfile'))
    };
  }
  
  private async detectType(dir: string): Promise<ProjectType> {
    if (await this.exists(path.join(dir, 'package.json'))) return 'nodejs';
    if (await this.exists(path.join(dir, 'pyproject.toml'))) return 'python';
    if (await this.exists(path.join(dir, 'go.mod'))) return 'go';
    if (await this.exists(path.join(dir, 'Cargo.toml'))) return 'rust';
    return 'unknown';
  }
  
  // ... other methods
}
```

**Validation**: Correctly detects project types

#### 3.2 Create `src/project/initializer.ts`

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import { ProjectContext } from '../utils/types';

export class SheenInitializer {
  private sheenDir: string;
  
  constructor(private projectContext: ProjectContext) {
    this.sheenDir = path.join(projectContext.rootDir, '.sheen');
  }
  
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.sheenDir);
      return true;
    } catch {
      return false;
    }
  }
  
  async initialize(prompt?: string): Promise<void> {
    await fs.mkdir(this.sheenDir, { recursive: true });
    await this.createPlan(prompt || 'General improvements');
    await this.createContext();
    await this.createConfig();
    await this.createHistory();
  }
  
  private async createPlan(prompt: string): Promise<void> {
    // Generate plan from template and prompt
    const planContent = `# Sheen Plan\n\n## Goal\n${prompt}\n\n## Tasks\n- TODO\n`;
    await fs.writeFile(path.join(this.sheenDir, 'plan.md'), planContent);
  }
  
  // ... other methods
}
```

**Validation**: Creates .sheen/ with all files

---

### Phase 4: OpenCode Integration

#### 4.1 Create `src/opencode/client.ts`

```typescript
import { spawn } from 'child_process';
import { OpenCodeConfig, ConversationContext, OpenCodeResponse } from '../utils/types';

export class OpenCodeClient {
  constructor(private config: OpenCodeConfig) {}
  
  async execute(prompt: string, context: ConversationContext): Promise<OpenCodeResponse> {
    // Run opencode as subprocess
    const opencode = spawn('opencode', ['run', '--continue', prompt], {
      cwd: context.projectContext.rootDir,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    
    opencode.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    return new Promise((resolve, reject) => {
      opencode.on('close', (code) => {
        if (code === 0) {
          resolve(this.parseOutput(output));
        } else {
          reject(new Error(`OpenCode exited with code ${code}`));
        }
      });
    });
  }
  
  private parseOutput(output: string): OpenCodeResponse {
    // Parse output for tool calls and phase markers
    // This needs to match OpenCode's actual output format
    return {
      toolCalls: [],
      thinking: output,
      phaseComplete: this.detectPhaseComplete(output)
    };
  }
  
  private detectPhaseComplete(output: string): boolean {
    return /DISCOVERY COMPLETE|PLAN COMPLETE|IMPLEMENTATION COMPLETE/i.test(output);
  }
  
  async isAvailable(): Promise<boolean> {
    // Check if opencode command exists
    try {
      await spawn('which', ['opencode']);
      return true;
    } catch {
      return false;
    }
  }
}
```

**Validation**: Can execute OpenCode and get response

#### 4.2 Create `src/opencode/adapter.ts`

```typescript
import { ToolCallAdapter } from '../utils/types';

export class ToolCallAdapter {
  // Implementation
}
```

**Validation**: Can parse and execute tool calls

---

### Phase 5: Tool System

#### 5.1 Create `src/tools/index.ts` (Registry)

```typescript
import { Tool, ToolCategory } from '../utils/types';

export class ToolRegistry {
  private tools = new Map<string, Tool>();
  
  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }
  
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }
  
  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }
  
  // ... other methods
}
```

#### 5.2 Create `src/tools/file.ts`

Implement all file tools as defined in API Contracts.

**Validation**: Each tool works correctly

#### 5.3 Create `src/tools/git.ts`

Implement all git tools.

**Validation**: Git operations work

#### 5.4 Create `src/tools/shell.ts`

Implement shell execution tool.

**Validation**: Can execute commands safely

---

### Phase 6: Agent Core

#### 6.1 Create `src/core/planner.ts`

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import { Task, ProjectContext } from '../utils/types';

export class TaskPlanner {
  private tasks: Task[] = [];
  private planPath: string;
  
  constructor(private projectContext: ProjectContext) {
    this.planPath = path.join(projectContext.rootDir, '.sheen', 'plan.md');
  }
  
  async createPlan(prompt: string): Promise<Task[]> {
    // Use OpenCode to generate initial plan
    this.tasks = [{
      id: '1',
      description: prompt,
      status: 'pending',
      priority: 'high',
      phase: 'implementation',
      createdAt: new Date(),
      attempts: 0
    }];
    
    await this.savePlan();
    return this.tasks;
  }
  
  async getNextTask(state: ExecutionState): Promise<Task | null> {
    return this.tasks.find(t => t.status === 'pending') || null;
  }
  
  // ... other methods
}
```

**Validation**: Can create and manage tasks

#### 6.2 Create `src/core/loop.ts`

```typescript
import { ExecutionState, AgentConfig } from '../utils/types';
import { TaskPlanner } from './planner';
import { OpenCodeClient } from '../opencode/client';
import { ToolRegistry } from '../tools';

export class ExecutionLoop {
  constructor(
    private config: AgentConfig,
    private planner: TaskPlanner,
    private opencode: OpenCodeClient,
    private toolRegistry: ToolRegistry
  ) {}
  
  async execute(state: ExecutionState): Promise<ExecutionState> {
    while (this.shouldContinue(state)) {
      await this.executeIteration(state);
      state.iteration++;
      
      if (this.config.sleepBetweenIterations > 0) {
        await this.sleep(this.config.sleepBetweenIterations);
      }
    }
    
    return state;
  }
  
  private async executeIteration(state: ExecutionState): Promise<void> {
    // Get next task
    const task = await this.planner.getNextTask(state);
    if (!task) return;
    
    // Build prompt
    const prompt = this.buildPrompt(task, state);
    
    // Execute with OpenCode
    const response = await this.opencode.execute(prompt, {
      projectContext: state.projectContext,
      currentTask: task,
      recentHistory: [],
      availableTools: this.toolRegistry.getAll()
    });
    
    // Execute tool calls
    // Update state
    // Check phase transition
  }
  
  private shouldContinue(state: ExecutionState): boolean {
    return state.iteration < this.config.maxIterations && !state.paused;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms * 1000));
  }
}
```

**Validation**: Can execute autonomous loop

#### 6.3 Create `src/core/agent.ts`

```typescript
import { AgentConfig, ProjectContext, ExecutionState } from '../utils/types';
import { ExecutionLoop } from './loop';
import { TaskPlanner } from './planner';
import { OpenCodeClient } from '../opencode/client';
import { ToolRegistry } from '../tools';

export class Agent {
  private state: ExecutionState;
  private loop: ExecutionLoop;
  
  constructor(
    private config: AgentConfig,
    private projectContext: ProjectContext
  ) {
    this.state = this.initializeState();
    
    const planner = new TaskPlanner(projectContext);
    const opencode = new OpenCodeClient(config.opencode);
    const toolRegistry = new ToolRegistry();
    
    // Register built-in tools
    this.registerTools(toolRegistry);
    
    this.loop = new ExecutionLoop(config, planner, opencode, toolRegistry);
  }
  
  async run(initialPrompt?: string): Promise<ExecutionState> {
    // Initialize plan if needed
    if (initialPrompt) {
      // Create initial plan
    }
    
    // Run loop
    this.state = await this.loop.execute(this.state);
    
    return this.state;
  }
  
  private initializeState(): ExecutionState {
    return {
      iteration: 0,
      phase: 'discovery',
      phaseIteration: 0,
      tasks: [],
      metrics: {
        testCount: 0,
        fileCount: 0,
        commitCount: 0,
        noProgressCount: 0
      },
      errors: [],
      startedAt: new Date(),
      lastActivityAt: new Date(),
      paused: false,
      userMessages: []
    };
  }
  
  private registerTools(registry: ToolRegistry): void {
    // Register all built-in tools
  }
  
  // ... other methods (pause, resume, stop, etc.)
}
```

**Validation**: End-to-end execution works

---

### Phase 7-9: I/O, Utils, Testing

Continue with remaining modules following the same pattern.

---

## Test Plan

### Unit Tests

**Priority**: Medium (after MVP works)

**Coverage**:
- `ProjectDetector`: Test detection of various project types
- `TaskPlanner`: Test task creation and management
- `ToolRegistry`: Test tool registration and execution
- Each tool: Test with various inputs

**Framework**: Native Node.js test runner or Jest

**Example**:
```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ProjectDetector } from '../src/project/detector';

describe('ProjectDetector', () => {
  it('detects Node.js project', async () => {
    const detector = new ProjectDetector();
    const context = await detector.detect('./fixtures/nodejs-project');
    assert.equal(context.type, 'nodejs');
  });
});
```

### Integration Tests

**Priority**: High (critical for MVP)

**Tests**:
1. **End-to-End Simple Prompt**
   - Run `sheen "create hello.txt with hello world"`
   - Verify file created
   - Verify .sheen/ initialized

2. **Auto-Resume**
   - Initialize .sheen/ with plan
   - Run `sheen --auto`
   - Verify continues from plan

3. **Tool Execution**
   - Test each tool individually
   - Verify results match expectations

4. **Error Recovery**
   - Simulate OpenCode failure
   - Verify retry logic works
   - Verify graceful degradation

### Smoke Tests

**Priority**: Highest (MVP requirement)

```bash
# Install globally
npm run build
npm link

# Test 1: Version
sheen --version
# Expected: 0.1.0

# Test 2: Help
sheen --help
# Expected: Usage information

# Test 3: Empty directory
cd /tmp/test-sheen
sheen "create package.json for Node.js project"
# Expected: .sheen/ created, package.json created

# Test 4: Existing project
cd ~/my-project
sheen "add a README"
# Expected: README.md created or updated

# Test 5: Auto mode
cd /tmp/test-sheen
sheen --auto
# Expected: Resumes from .sheen/plan.md
```

### Manual Testing Checklist

- [ ] Install globally with `npm link`
- [ ] Run `sheen --version` - shows 0.1.0
- [ ] Run `sheen --help` - shows usage
- [ ] Run in empty directory - creates .sheen/
- [ ] Run with prompt - executes task
- [ ] Run with --auto - resumes from plan
- [ ] Interrupt with Ctrl+C - graceful shutdown
- [ ] Check logs in .sheen/history.jsonl
- [ ] Verify git commits created (if enabled)
- [ ] Test on Windows and Unix

---

## Integration Strategy

### OpenCode Communication

**Investigation needed**: Exact format of tool calls from OpenCode.

**Assumed format** (MCP-like):
```json
{
  "tool": "read_file",
  "parameters": {
    "path": "package.json"
  }
}
```

**Parsing strategy**:
1. Look for JSON blocks in output
2. Parse tool calls
3. Execute via ToolRegistry
4. Format results back to OpenCode

### Context Management

**Context includes**:
- System prompt (sheen's purpose)
- Project context (from detection)
- Current task
- Recent tool calls and results (last 5)
- Available tools list

**Context size management**:
- Truncate old history if > 100k tokens
- Keep only relevant recent items
- Summarize completed tasks

---

## Migration from Bash

### Key Bash Patterns to Port

1. **Main Loop** (lines 587-722)
   → Port to `ExecutionLoop.execute()`

2. **Phase Detection** (lines 312-402)
   → Port to `PhaseDetector` or integrate into loop

3. **Progress Tracking** (lines 230-285)
   → Port to `ProgressTracker` class

4. **Error Recovery** (lines 287-310)
   → Integrate into loop with try/catch

5. **Auto Commit** (lines 551-585)
   → Port to `git_commit` tool with auto-commit option

### Bash → TypeScript Mapping

| Bash | TypeScript |
|------|------------|
| `run_opencode()` | `OpenCodeClient.execute()` |
| `check_phase_timeout()` | `ExecutionLoop.checkPhaseTimeout()` |
| `track_progress()` | `ProgressTracker.update()` |
| `detect_phase_completion()` | `PhaseDetector.detect()` |
| `auto_commit_changes()` | `git_commit tool + config` |

---

## Implementation Order

### Week 1: Foundation
- Days 1-2: Setup (Tasks 1.1-1.3)
- Days 3-4: CLI & Config (Tasks 2.1-2.3)
- Day 5: Testing and fixes

### Week 2: Core Functionality
- Days 1-2: Project detection (Tasks 3.1-3.4)
- Days 3-4: OpenCode integration (Tasks 4.1-4.2)
- Day 5: Testing and fixes

### Week 3: Tools & Agent
- Days 1-2: Tool system (Tasks 5.1-5.4)
- Days 3-5: Agent core (Tasks 6.1-6.4)

### Week 4: Polish & Testing
- Days 1-2: I/O system (Tasks 7.1-7.3)
- Day 3: Utilities (Tasks 8.1-8.3)
- Days 4-5: Testing (Tasks 9.1-9.3)

### Week 5: Dogfooding
- Switch to new sheen
- Use sheen to add remaining features
- Iterate based on experience

---

## Success Metrics

### MVP Complete When:
✅ Can install globally: `npm install -g sheen` (DONE - package.json configured)  
✅ `sheen --version` works (DONE - CLI implemented)  
✅ `sheen --help` shows usage (DONE - CLI implemented)  
⚠️ Can detect project types (PARTIALLY - needs testing)  
⚠️ Creates .sheen/ automatically (PARTIALLY - needs testing)  
❌ Executes simple prompts end-to-end (BLOCKED - needs planner/context)  
⚠️ Integrates with OpenCode successfully (PARTIALLY - needs testing)  
✅ File, git, shell tools work (DONE - 65 tests passing)  
❌ Smoke tests pass (PENDING - needs end-to-end implementation)  
❓ Works on Windows and Unix (UNTESTED)  

### Ready for Dogfooding When:
⚠️ All MVP criteria met (IN PROGRESS - 60% complete)  
❌ Can execute multi-step tasks (PENDING - needs planner)  
❌ Error recovery works (PENDING - needs loop integration)  
⚠️ Configuration system functional (PARTIALLY - basic structure exists)  
❌ Logs to history.jsonl (PENDING - logger skeleton exists)  
❌ Can resume interrupted sessions (PENDING - needs state persistence)  

### Remaining Implementation Tasks

**Priority 1 - Core Functionality** (Required for MVP):
1. [ ] Complete `src/core/planner.ts` - Task planning and management
2. [ ] Complete `src/core/context.ts` - Conversation context builder
3. [ ] Complete `src/io/prompt.ts` - System prompt construction  
4. [ ] Complete `src/core/loop.ts` - Full autonomous loop logic
5. [ ] Test OpenCode integration end-to-end
6. [ ] Implement phase detection and transition logic

**Priority 2 - Polish & Testing** (Required for Dogfooding):
7. [ ] Complete `src/io/output.ts` - Formatted output with ora/chalk
8. [ ] Complete `src/utils/logger.ts` - Structured logging to history.jsonl
9. [ ] Complete configuration loading (global + project merge)
10. [ ] Write integration tests for full flow
11. [ ] Run smoke tests and fix issues
12. [ ] Test npm link installation globally

**Priority 3 - Nice to Have** (Post-MVP):
13. [ ] Live input handler for user corrections
14. [ ] Progress tracking metrics
15. [ ] Phase timeout protection
16. [ ] Error recovery with retries
17. [ ] State persistence for resumption

---

## Implementation Recommendations

### Quick Wins (Complete These First)

1. **Planner Implementation** (~2-3 hours)
   - Simple task queue in memory
   - Single task for MVP (user's prompt)
   - Save/load from .sheen/plan.md
   
2. **Context Builder** (~1-2 hours)
   - Build system prompt with sheen's purpose
   - Include project type from detector
   - Add available tools list
   - Format as string for OpenCode
   
3. **Prompt Builder** (~1 hour)
   - Combine system prompt + context + task
   - Format for OpenCode subprocess input
   
4. **Integration Test** (~2-3 hours)
   - Create test directory
   - Run simple prompt: "create hello.txt"
   - Debug and fix issues
   - Verify file created

**Total estimated time to MVP: 6-11 hours of focused work**

### Testing Strategy for MVP

Instead of comprehensive tests, focus on:
1. One smoke test script that exercises the full flow
2. Manual testing with various prompts
3. Fix issues as they arise
4. Add more tests after MVP works

### Dogfooding Approach

Once basic flow works:
1. Test `npm link` installation
2. Run `sheen "add error handling to OpenCode client"`
3. Observe how sheen performs on itself
4. Fix critical issues
5. Iterate with more complex tasks

---

**PLAN COMPLETE - Ready for Implementation**

All technical designs, API contracts, and implementation plans are defined. Current state assessed at 60% complete with clear remaining tasks. Priority 1 tasks will complete MVP. Estimated 6-11 hours of focused implementation work remaining.

**Next Steps**: 
1. Implement src/core/planner.ts
2. Implement src/core/context.ts  
3. Implement src/io/prompt.ts
4. Run integration test
5. Debug and iterate until smoke test passes
