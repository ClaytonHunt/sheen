# Sheen Build Plan

## Overview
Build sheen - an autonomous coding agent with human oversight that can be called globally from anywhere.

**Reference Implementation:** A working bash version exists in `sheen.sh` (774 lines) from the AdventureEngine project. This provides proven patterns for:
- Autonomous loop with phase management
- OpenCode integration
- Error recovery and retry logic
- Progress tracking
- Git automation
- Configuration system

**Goal:** Port these concepts to a Node.js/TypeScript global CLI tool with enhanced capabilities.

## Exit Criteria
The current version of sheen should exit when:
- ✅ All tasks marked as DONE
- ✅ `npm link` successfully creates global `sheen` command
- ✅ Can run `sheen --version` and get version output
- ✅ Can run `sheen --help` and see usage information
- ✅ Basic smoke test passes: `sheen "echo hello"` in a test directory

**At that point, switch to using the new sheen binary for all future development.**

---

## Phase 1: Project Setup & Foundation

### Task 1.1: Initialize Node.js/TypeScript Project
**Status**: TODO  
**Priority**: HIGH

- [ ] Create `package.json` with proper bin configuration for global CLI
- [ ] Add necessary dependencies:
  - TypeScript
  - tsx (for development)
  - commander (CLI parsing)
  - chalk (colored output)
  - ora (spinners)
  - inquirer (interactive prompts)
  - dotenv (environment config)
- [ ] Create `tsconfig.json` with strict mode and proper module resolution
- [ ] Add scripts: `build`, `dev`, `test`
- [ ] Create `.gitignore`

**Files to create**:
- `package.json`
- `tsconfig.json`
- `.gitignore`

---

### Task 1.2: Create Basic Project Structure
**Status**: TODO  
**Priority**: HIGH

Create the following directory structure:
```
src/
├── index.ts              # Main entry point with #!/usr/bin/env node
├── cli.ts                # CLI argument parsing
├── core/
│   ├── agent.ts          # Main agent orchestrator
│   ├── loop.ts           # Autonomous execution loop
│   ├── planner.ts        # Task planning
│   └── context.ts        # Project context analyzer
├── io/
│   ├── input.ts          # Live input handler
│   ├── output.ts         # Formatted output
│   └── prompt.ts         # Prompt construction
├── project/
│   ├── detector.ts       # Project type detection
│   ├── initializer.ts    # Auto-initialize .sheen/
│   ├── analyzer.ts       # Project structure analysis
│   └── loader.ts         # Load .sheen/ files
├── opencode/
│   ├── client.ts         # OpenCode integration
│   └── adapter.ts        # Tool call adapter
├── tools/
│   ├── index.ts          # Tool registry
│   ├── file.ts           # File operations
│   ├── git.ts            # Git operations
│   └── shell.ts          # Shell commands
├── config/
│   ├── global.ts         # Global config (~/.sheen/)
│   └── project.ts        # Project config
└── utils/
    ├── logger.ts         # Logging utilities
    └── types.ts          # TypeScript type definitions
```

**Files to create**: All structure files with basic exports

---

### Task 1.3: Create Template Files
**Status**: TODO  
**Priority**: MEDIUM

Create templates for initializing new projects:

```
templates/
├── init/
│   ├── plan.md           # Template for plan.md
│   ├── context.md        # Template for context.md
│   └── config.json       # Template for config.json
└── examples/
    └── hello-world.md    # Example plan for testing
```

**Files to create**: Template files

---

## Phase 2: Core CLI & Configuration

### Task 2.1: Implement CLI Entry Point (src/index.ts)
**Status**: TODO  
**Priority**: HIGH

Create the main entry point that:
- Has proper shebang: `#!/usr/bin/env node`
- Handles graceful shutdown (SIGINT, SIGTERM)
- Sets up error handlers
- Calls CLI parser

**Key features**:
```typescript
#!/usr/bin/env node

// Handle uncaught errors
process.on('unhandledRejection', handleError);
process.on('uncaughtException', handleError);

// Graceful shutdown
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Run CLI
main().catch(handleError);
```

**Files to create/edit**: `src/index.ts`

---

### Task 2.2: Implement CLI Parser (src/cli.ts)
**Status**: TODO  
**Priority**: HIGH

Use Commander.js to create CLI interface:

```bash
# Command patterns to support
sheen "prompt text"                    # Direct prompt
sheen --auto                           # Auto-resume from plan
sheen --continue                       # Continue previous session
sheen init                             # Initialize .sheen/ directory
sheen --version                        # Show version
sheen --help                           # Show help
```

**Options to support**:
- `--auto, -a`: Auto-resume mode
- `--continue, -c`: Continue previous session
- `--approve-all`: Skip all confirmations
- `--max-iterations <n>`: Limit iterations
- `--verbose, -v`: Verbose logging
- `--config <path>`: Custom config file

**Files to create/edit**: `src/cli.ts`

---

### Task 2.3: Implement Configuration System
**Status**: TODO  
**Priority**: HIGH

**Global config** (`~/.sheen/config.json`):
```json
{
  "defaultModel": "opencode",
  "autoApprove": false,
  "maxIterations": 50,
  "logLevel": "info",
  "opencode": {
    "apiKey": "env:OPENCODE_API_KEY",
    "endpoint": "http://localhost:3000"
  }
}
```

**Project config** (`.sheen/config.json`):
```json
{
  "maxIterations": 20,
  "autoApprove": false,
  "tools": ["file", "git", "shell"],
  "excludePatterns": ["node_modules", ".git", "dist"]
}
```

**Features**:
- Load global config from `~/.sheen/config.json`
- Override with project config `.sheen/config.json`
- Override with CLI flags
- Create default configs if missing

**Files to create/edit**:
- `src/config/global.ts`
- `src/config/project.ts`

---

## Phase 3: Project Detection & Initialization

### Task 3.1: Implement Project Detector (src/project/detector.ts)
**Status**: TODO  
**Priority**: HIGH

Detect project type by analyzing:
- `package.json` → Node.js project
- `requirements.txt` or `pyproject.toml` → Python project
- `go.mod` → Go project
- `Cargo.toml` → Rust project
- `.git/` → Git repository
- Empty directory → New project

**Return project context**:
```typescript
interface ProjectContext {
  type: 'nodejs' | 'python' | 'go' | 'rust' | 'web' | 'unknown';
  framework?: string;
  language?: string;
  packageManager?: string;
  hasTests: boolean;
  hasDocker: boolean;
  git?: {
    initialized: boolean;
    remote?: string;
    branch?: string;
  };
  structure: string[];  // Main directories
}
```

**Files to create/edit**: `src/project/detector.ts`

---

### Task 3.2: Implement Project Analyzer (src/project/analyzer.ts)
**Status**: TODO  
**Priority**: HIGH

Deep analysis of project:
- Parse `package.json` dependencies and scripts
- Detect frameworks (Express, React, Next.js, FastAPI, Django)
- Identify testing setup (Jest, Pytest, Go test)
- Find linting/formatting config (ESLint, Prettier, Black)
- Analyze directory structure
- Detect coding conventions

**Files to create/edit**: `src/project/analyzer.ts`

---

### Task 3.3: Implement .sheen/ Initializer (src/project/initializer.ts)
**Status**: TODO  
**Priority**: HIGH

Auto-create `.sheen/` directory with:

1. **plan.md** - Generated based on:
   - User's initial prompt
   - Detected project type
   - Existing project structure
   
2. **context.md** - Auto-generated with:
   - Project type and framework
   - Dependencies
   - Directory structure
   - Detected conventions
   - Relevant notes

3. **config.json** - Project-specific settings

4. **history.jsonl** - Empty initially, logs execution

**Features**:
- Only create if doesn't exist
- Use templates from `templates/init/`
- Fill in project-specific details
- Add to `.gitignore` if git repo exists

**Files to create/edit**: `src/project/initializer.ts`

---

### Task 3.4: Implement .sheen/ Loader (src/project/loader.ts)
**Status**: TODO  
**Priority**: MEDIUM

Load existing `.sheen/` directory:
- Parse `plan.md` to extract tasks and status
- Load `context.md` for project understanding
- Load `config.json` for settings
- Read `history.jsonl` for previous execution logs

**Files to create/edit**: `src/project/loader.ts`

---

## Phase 4: OpenCode Integration

### Task 4.1: Implement OpenCode Client (src/opencode/client.ts)
**Status**: TODO  
**Priority**: HIGH

Create OpenCode API client:
- Send prompts to OpenCode
- Receive streaming responses
- Handle tool calls from OpenCode
- Maintain conversation context

**Integration options** (choose based on OpenCode's API):
1. HTTP API calls to OpenCode server
2. Spawn OpenCode as subprocess
3. Use OpenCode SDK if available

**Files to create/edit**: `src/opencode/client.ts`

---

### Task 4.2: Implement Tool Call Adapter (src/opencode/adapter.ts)
**Status**: TODO  
**Priority**: HIGH

Bridge between OpenCode tool calls and sheen's tool system:
- Parse tool calls from OpenCode
- Route to appropriate tool handlers
- Execute tools
- Format results for OpenCode
- Handle errors gracefully

**Files to create/edit**: `src/opencode/adapter.ts`

---

## Phase 5: Tool System

### Task 5.1: Implement Tool Registry (src/tools/index.ts)
**Status**: TODO  
**Priority**: HIGH

Central registry for all tools:
- Register built-in tools
- Load custom tools from `.sheen/tools/`
- Validate tool definitions
- Route tool calls to handlers

**Tool interface**:
```typescript
interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any) => Promise<any>;
}
```

**Files to create/edit**: `src/tools/index.ts`

---

### Task 5.2: Implement File Tools (src/tools/file.ts)
**Status**: TODO  
**Priority**: HIGH

File operation tools:
- `read_file` - Read file contents
- `write_file` - Write/overwrite file
- `edit_file` - Edit specific lines/sections
- `delete_file` - Delete file
- `list_files` - List directory contents
- `search_files` - Search file contents (grep)

**Safety features**:
- Respect `.gitignore` patterns
- Exclude configured patterns
- Warn before destructive operations

**Files to create/edit**: `src/tools/file.ts`

---

### Task 5.3: Implement Git Tools (src/tools/git.ts)
**Status**: TODO  
**Priority**: MEDIUM

Git operation tools:
- `git_status` - Show status
- `git_diff` - Show changes
- `git_commit` - Create commit
- `git_branch` - Branch operations
- `git_log` - View history

**Files to create/edit**: `src/tools/git.ts`

---

### Task 5.4: Implement Shell Tools (src/tools/shell.ts)
**Status**: TODO  
**Priority**: HIGH

Execute shell commands:
- `shell_exec` - Run command and return output
- Timeout support
- Working directory support
- Environment variable support

**Safety**:
- Warn before potentially dangerous commands
- Timeout long-running commands
- Capture stdout/stderr separately

**Files to create/edit**: `src/tools/shell.ts`

---

## Phase 6: Agent Core Logic

### Task 6.1: Implement Task Planner (src/core/planner.ts)
**Status**: TODO  
**Priority**: HIGH

Task planning and management:
- Parse user prompt into tasks
- Break down complex tasks
- Track task status (todo, in_progress, done)
- Update plan.md with progress
- Handle task dependencies

**Task format**:
```typescript
interface Task {
  id: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done' | 'failed';
  priority: 'high' | 'medium' | 'low';
  dependencies?: string[];
  result?: any;
}
```

**Files to create/edit**: `src/core/planner.ts`

---

### Task 6.2: Implement Agent Loop (src/core/loop.ts)
**Status**: TODO  
**Priority**: HIGH

Main autonomous execution loop:

```
1. Get next task from planner
2. Create prompt with task + context
3. Send to OpenCode
4. Receive tool calls
5. Execute tools via adapter
6. Send results back to OpenCode
7. Update task status
8. Check for user input
9. Repeat until done or interrupted
```

**Features**:
- Non-blocking user input (queue messages)
- Graceful interruption (Ctrl+C)
- Max iteration limit
- Error recovery
- Progress tracking

**Files to create/edit**: `src/core/loop.ts`

---

### Task 6.3: Implement Agent Orchestrator (src/core/agent.ts)
**Status**: TODO  
**Priority**: HIGH

High-level agent coordination:
- Initialize project context
- Set up planner
- Configure OpenCode client
- Start execution loop
- Handle live user input
- Clean up on exit

**Files to create/edit**: `src/core/agent.ts`

---

### Task 6.4: Implement Context Manager (src/core/context.ts)
**Status**: TODO  
**Priority**: MEDIUM

Manage conversation context for OpenCode:
- System prompt with project context
- Recent tool calls and results
- Task history
- User corrections/inputs
- Keep context size manageable

**Files to create/edit**: `src/core/context.ts`

---

## Phase 7: I/O & User Interaction

### Task 7.1: Implement Output Formatter (src/io/output.ts)
**Status**: TODO  
**Priority**: MEDIUM

Format and display output:
- Colored output with chalk
- Spinners with ora
- Progress indicators
- Task status display
- Stream OpenCode responses
- Format tool call results

**Example output**:
```
🤖 Analyzing project...
✓ Detected: Node.js/TypeScript project
📋 Generated plan with 8 tasks

[Task 1/8] Installing dependencies...
  $ npm install express typescript
  ✓ Completed in 12s
```

**Files to create/edit**: `src/io/output.ts`

---

### Task 7.2: Implement Input Handler (src/io/input.ts)
**Status**: TODO  
**Priority**: MEDIUM

Handle live user input during execution:
- Non-blocking input (use readline)
- Queue user messages
- Special commands:
  - `pause` - Pause execution
  - `resume` - Resume execution
  - `stop` - Stop and exit
  - `status` - Show current status
  - `help` - Show available commands
- Pass user corrections to agent

**Files to create/edit**: `src/io/input.ts`

---

### Task 7.3: Implement Prompt Builder (src/io/prompt.ts)
**Status**: TODO  
**Priority**: HIGH

Build prompts for OpenCode:
- System prompt with sheen's purpose
- Project context from context.md
- Current task description
- Available tools
- Recent history
- User's latest input

**Files to create/edit**: `src/io/prompt.ts`

---

## Phase 8: Utilities & Polish

### Task 8.1: Implement Logger (src/utils/logger.ts)
**Status**: TODO  
**Priority**: MEDIUM

Logging utility:
- Log levels: debug, info, warn, error
- Write to `.sheen/history.jsonl`
- Console output based on verbosity
- Structured logs (JSON lines)

**Files to create/edit**: `src/utils/logger.ts`

---

### Task 8.2: Create Type Definitions (src/utils/types.ts)
**Status**: TODO  
**Priority**: LOW

Central type definitions:
- ProjectContext
- Task
- Tool
- Config
- ExecutionState
- etc.

**Files to create/edit**: `src/utils/types.ts`

---

### Task 8.3: Add README.md
**Status**: TODO  
**Priority**: MEDIUM

Comprehensive README with:
- Overview of sheen
- Installation instructions
- Usage examples
- Configuration guide
- Architecture overview
- Contributing guidelines

**Files to create/edit**: `README.md`

---

## Phase 9: Testing & Validation

### Task 9.1: Create Smoke Test
**Status**: TODO  
**Priority**: HIGH

Basic smoke test to verify:
- CLI starts successfully
- `--version` works
- `--help` works
- Can initialize .sheen/ directory
- Can parse a simple prompt
- Can execute basic tool (echo)

**Files to create/edit**: `tests/smoke.test.ts`

---

### Task 9.2: Manual Testing Checklist
**Status**: TODO  
**Priority**: HIGH

Test scenarios:
- [ ] Install globally: `npm link`
- [ ] Run from empty directory: `sheen "create hello.txt with hello world"`
- [ ] Run from Node.js project: `sheen "add a new script to package.json"`
- [ ] Test auto-resume: Run `sheen --auto` after interrupting
- [ ] Test live input: Type correction while running
- [ ] Test `sheen init` command
- [ ] Verify `.sheen/` files are created correctly

---

### Task 9.3: Build & Link for Global Use
**Status**: TODO  
**Priority**: HIGH

Make sheen available globally:
```bash
npm run build
npm link
sheen --version  # Should work!
```

Verify in different directories:
```bash
cd /tmp
sheen "echo test"  # Should work from anywhere
```

---

## Phase 10: Dogfooding & Iteration

### Task 10.1: Use Sheen to Build Sheen
**Status**: TODO  
**Priority**: HIGH

Once basic version works:
1. Exit current build process
2. Switch to using `sheen` command
3. Test by having sheen add new features to itself
4. Iterate based on dogfooding experience

**Success criteria**:
- Can run: `sheen "Add better error handling to tool execution"`
- Sheen successfully modifies its own code
- Changes work as expected

---

## Notes

### Dependencies to Install
```json
{
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
  }
}
```

### Key Design Principles
1. **Start simple**: Get basic loop working first
2. **Fail gracefully**: Always handle errors
3. **User feedback**: Show what's happening
4. **Interruptible**: Always allow Ctrl+C
5. **Resumable**: Save state for continuation
6. **Safe**: Warn before destructive operations

### Open Questions for Implementation
- [ ] How exactly does OpenCode API work? (HTTP? Subprocess?)
- [ ] What format do tool calls use?
- [ ] Should we support streaming output from OpenCode?
- [ ] How to handle long-running operations?

---

## Success Metrics

This phase is complete when:
- ✅ Can install globally: `npm install -g sheen`
- ✅ Works from any directory
- ✅ Auto-detects projects and initializes `.sheen/`
- ✅ Can execute basic prompts end-to-end
- ✅ Integrates with OpenCode successfully
- ✅ Can resume interrupted sessions
- ✅ Accepts live user input
- ✅ Passes smoke tests
- ✅ **Ready to dogfood: Can use sheen to build sheen**
