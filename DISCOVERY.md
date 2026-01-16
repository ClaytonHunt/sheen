# Discovery Phase: Building Sheen v0.1.0

**Date**: January 16, 2026  
**Updated**: January 16, 2026 (Current state analysis added)  
**Goal**: Build a Node.js/TypeScript global CLI tool for autonomous development with OpenCode integration

## Project Understanding

### What is Sheen?

Sheen is an autonomous coding agent that:
- Runs as a global CLI tool (`npm install -g sheen`)
- Works from any directory
- Auto-detects project types and creates intelligent plans
- Executes development tasks autonomously with human oversight
- Integrates with OpenCode as the LLM backend
- Can pause, resume, and accept live corrections

### Reference Implementation Analysis

A working bash version (`sheen.sh`, 774 lines) exists from AdventureEngine. Key insights:

**1. Autonomous Loop Pattern** (lines 587-722)
```
Initialize phase → While iterations < max:
  - Display iteration info
  - Check phase timeout
  - Track progress metrics
  - Run OpenCode with context
  - Detect phase completion
  - Transition or continue
  - Sleep between iterations
```

**2. Phase Management** (lines 312-402)
- Discovery → Planning → Implementation → Validation → Complete
- Each phase has completion markers (e.g., "DISCOVERY COMPLETE")
- Automatic detection via file scanning
- Timeout protection per phase

**3. OpenCode Integration** (lines 404-498)
- Updates PROMPT.md with current phase
- Runs `opencode run --continue` to maintain context
- Captures output to log files
- Tracks commits created during execution
- Supports verbose and quiet modes

**4. Error Recovery** (lines 287-310)
- Counts consecutive OpenCode errors
- Max retry limits (default: 3)
- Test failure handling with retries
- Progress stall detection (5 iterations without change)

**5. Progress Tracking** (lines 230-285)
- Monitors test count, file count, commit hash
- Detects when no progress is being made
- Logs progress changes ("+N tests added", "+N files")

**6. Configuration System** (.sheenconfig)
- Max iterations, phase timeouts
- Auto-commit settings
- Error recovery thresholds
- Customizable per-project

### Requirements for Node.js/TypeScript Version

**Must Have (MVP)**:
1. Global CLI installation via npm
2. CLI argument parsing (--auto, --help, --version, etc.)
3. Project detection and .sheen/ auto-initialization
4. Basic autonomous loop with OpenCode integration
5. File, git, and shell tools
6. Configuration system (global + project)
7. Graceful shutdown and error handling

**Should Have (Post-MVP)**:
1. Live user input during execution
2. Progress tracking and metrics
3. Phase timeout protection
4. Test execution and retry logic
5. Multiple project type detection

**Could Have (Future)**:
1. Plugin system for custom tools
2. Web UI for monitoring
3. Team collaboration features
4. Cloud state sync

## Architecture Decisions

### Technology Stack

**Language**: TypeScript with strict mode
- Type safety for complex state management
- Great tooling and IDE support
- Compiles to Node.js for cross-platform

**CLI Framework**: Commander.js
- Industry standard
- Clean API
- Good documentation
- Supports subcommands

**Output Formatting**:
- Chalk (v4) for colors
- Ora (v5) for spinners
- Console logging (no complex UI frameworks)

**Configuration**: JSON files
- `~/.sheen/config.json` for global settings
- `.sheen/config.json` for project settings
- Simple, human-editable

### Project Structure

Following vertical slice + feature-based organization:

```
src/
├── index.ts              # Entry point
├── cli.ts                # CLI parsing
├── core/                 # Core agent logic
│   ├── agent.ts         # Main orchestrator
│   ├── loop.ts          # Autonomous execution
│   ├── planner.ts       # Task management
│   └── context.ts       # Context management
├── project/              # Project detection
├── opencode/             # OpenCode integration
├── tools/                # Built-in tools
├── io/                   # Input/output
├── config/               # Configuration
└── utils/                # Utilities
```

### Key Design Patterns

**1. Autonomous Loop**
```typescript
while (iteration < maxIterations) {
  const task = await planner.getNextTask();
  const prompt = buildPrompt(task, context);
  const response = await opencode.execute(prompt);
  const toolCalls = parseToolCalls(response);
  await executeTools(toolCalls);
  await planner.updateProgress(task);
  await checkForUserInput();
}
```

**2. Tool System**
```typescript
interface Tool {
  name: string;
  description: string;
  parameters: Schema;
  execute(params: any): Promise<any>;
}

const toolRegistry = new Map<string, Tool>();
toolRegistry.set('read_file', readFileTool);
toolRegistry.set('write_file', writeFileTool);
// etc.
```

**3. Project Detection**
```typescript
async function detectProject(cwd: string): Promise<ProjectContext> {
  const hasPackageJson = await exists('package.json');
  const hasPyProject = await exists('pyproject.toml');
  // ... detect type
  return {
    type: 'nodejs',
    framework: 'express',
    language: 'typescript',
    // ...
  };
}
```

**4. .sheen/ Initialization**
```typescript
async function initializeSheen(prompt: string, context: ProjectContext) {
  if (!await exists('.sheen')) {
    await mkdir('.sheen');
    await writeFile('.sheen/plan.md', generatePlan(prompt, context));
    await writeFile('.sheen/context.md', generateContext(context));
    await writeFile('.sheen/config.json', defaultConfig);
  }
}
```

## Technical Challenges

### 1. OpenCode Integration
**Challenge**: How exactly does OpenCode work? HTTP API? Subprocess? SDK?

**Investigation Needed**:
- Check if OpenCode has a Node.js SDK
- Test subprocess execution with `child_process`
- Understand tool call format (likely MCP protocol)
- Handle streaming vs. batch responses

**Proposed Solution**: Start with subprocess execution using `child_process.spawn`, similar to bash version.

### 2. Live Input During Execution
**Challenge**: Accept user input while agent loop is running.

**Options**:
- `readline` with async iterators
- Separate stdin listener with message queue
- Use `inquirer` for interactive prompts when paused

**Proposed Solution**: Message queue with non-blocking readline.

### 3. Cross-Platform Compatibility
**Challenge**: Windows vs. Unix differences (paths, shell commands).

**Solutions**:
- Use `path.join()` and `path.resolve()` for paths
- Use cross-platform shell commands where possible
- Test on both Windows and Unix

### 4. Global Installation
**Challenge**: Ensure shebang works on all platforms.

**Solution**:
```json
{
  "bin": {
    "sheen": "./dist/index.js"
  }
}
```

With shebang: `#!/usr/bin/env node`

## Dependencies Analysis

**Production**:
- `commander@^11.0.0` - CLI parsing (800KB)
- `chalk@^4.1.2` - Terminal colors (180KB, ESM compatible)
- `ora@^5.4.1` - Spinners (250KB)
- `inquirer@^8.2.5` - Interactive prompts (1.5MB)
- `dotenv@^16.0.3` - Environment variables (25KB)

**Development**:
- `typescript@^5.0.0` - Type system
- `tsx@^4.0.0` - TS execution (dev/test)
- `@types/node@^20.0.0` - Node.js types
- `@types/inquirer@^9.0.0` - Inquirer types

**Total Size**: ~3MB for production dependencies (reasonable for CLI tool)

## Implementation Strategy

### Phase 1: Foundation (Tasks 1.1-1.3)
**Goal**: Project setup, structure, templates

**Deliverables**:
- package.json with dependencies
- tsconfig.json configured
- Directory structure created
- Template files for .sheen/ initialization

**Validation**: `npm install && npm run build` succeeds

---

### Phase 2: CLI & Config (Tasks 2.1-2.3)
**Goal**: Working CLI with configuration

**Deliverables**:
- Entry point with signal handling
- CLI parser with all commands
- Global + project config system

**Validation**: `npm link && sheen --help` works

---

### Phase 3: Project Detection (Tasks 3.1-3.4)
**Goal**: Auto-detect projects and initialize .sheen/

**Deliverables**:
- Project type detector
- Structure analyzer
- .sheen/ initializer
- Loader for existing .sheen/

**Validation**: Run in test directory, verify .sheen/ creation

---

### Phase 4: OpenCode Integration (Tasks 4.1-4.2)
**Goal**: Working OpenCode client

**Deliverables**:
- OpenCode client (subprocess or API)
- Tool call adapter
- Streaming support

**Validation**: Send prompt to OpenCode, receive response

---

### Phase 5: Tool System (Tasks 5.1-5.4)
**Goal**: Built-in tools for file, git, shell

**Deliverables**:
- Tool registry
- File tools (read, write, edit)
- Git tools (status, commit, diff)
- Shell tool (exec)

**Validation**: Execute each tool, verify results

---

### Phase 6: Agent Core (Tasks 6.1-6.4)
**Goal**: Autonomous execution loop

**Deliverables**:
- Task planner
- Execution loop
- Agent orchestrator
- Context manager

**Validation**: Run end-to-end with simple prompt

---

### Phase 7: I/O (Tasks 7.1-7.3)
**Goal**: Formatted output and live input

**Deliverables**:
- Output formatter with colors/spinners
- Input handler (non-blocking)
- Prompt builder

**Validation**: Clean, readable output; accept live input

---

### Phase 8: Utilities (Tasks 8.1-8.3)
**Goal**: Logging, types, documentation

**Deliverables**:
- Logger with history.jsonl
- Type definitions
- README.md

**Validation**: Logs work, types compile, docs clear

---

### Phase 9: Testing (Tasks 9.1-9.3)
**Goal**: Verification and validation

**Deliverables**:
- Smoke test
- Manual test checklist
- Global installation verified

**Validation**: All tests pass, sheen works globally

---

### Phase 10: Dogfooding (Task 10.1)
**Goal**: Use sheen to build sheen!

**Deliverables**:
- Switch to new sheen binary
- Add features using sheen
- Iterate and improve

**Validation**: Sheen successfully modifies itself

## Success Criteria

This discovery phase is complete when:

✅ Project requirements fully understood  
✅ Reference implementation analyzed  
✅ Architecture decisions documented  
✅ Technical challenges identified  
✅ Implementation strategy defined  
✅ Dependencies validated  
✅ DISCOVERY.md created  
✅ **Current state assessed** (Added: Jan 16, 2026)
✅ **Implementation progress analyzed** (Added: Jan 16, 2026)

## Current State Assessment (Updated: Jan 16, 2026)

### Implementation Progress

**Recent Git History Analysis:**
```
acf394b feat: complete implementation for slice 2.1-session-management
7f62ba2 docs: update README with v0.1.0 features and usage examples
3eea34d docs: mark implementation complete - 65 tests passing
4849ff8 test: enhance smoke-test.sh with comprehensive checks
3649037 test: add ToolRegistry tests (20 tests passing)
27d2102 test: add file tools tests (16 tests passing)
43bf33a docs: update PROJECT_STATUS.md with comprehensive progress
6e3d8fb feat: register all tools in Agent (9 tools total)
f033a68 test: add shell_exec tool tests (7 tests passing)
2cf5c7b test: add git tools tests (10 tests passing)
```

**Status**: Significant progress made on tool system and testing infrastructure. 65 tests passing indicates solid foundation.

### What's Working ✅

1. **Project Structure** - Complete directory layout exists
2. **Package Configuration** - package.json properly configured with bin entry
3. **TypeScript Setup** - tsconfig.json in place
4. **Tool System** - 9 tools implemented and tested:
   - File tools: read_file, write_file, edit_file, list_files, search_files
   - Git tools: git_status, git_diff, git_commit, git_log
   - Shell tool: shell_exec
5. **Tool Registry** - Working tool registration system (20 tests)
6. **Testing Infrastructure** - Jest configured, 65 tests passing
7. **Smoke Test** - Enhanced smoke-test.sh for validation
8. **Documentation** - README updated with features and usage

### What's Missing ❌

**Critical Gaps** (Blocking MVP):
1. **OpenCode Integration** - Core client not implemented
2. **Agent Execution Loop** - Main autonomous loop incomplete
3. **Project Detection** - Auto-detection logic missing
4. **Prompt Builder** - Context and prompt construction needed
5. **Context Manager** - Conversation context management missing
6. **Global Install Testing** - `npm link` end-to-end verification needed

**Secondary Gaps** (Nice to have):
1. **Live Input System** - Non-blocking user input queue
2. **Output Formatting** - Rich output with ora spinners
3. **Logger** - Structured logging to history.jsonl
4. **Project Initializer** - Auto-create .sheen/ directories
5. **Configuration Loader** - Multi-tier config system  

## Open Questions

1. **OpenCode API**: What's the exact interface? Need to test.
   - **UPDATE**: Bash version uses `opencode run --continue` subprocess
   - **DECISION**: Start with subprocess approach (proven to work)
   
2. **Tool Call Format**: MCP protocol? Custom format? Need to verify.
   - **ACTION**: Test OpenCode output format in implementation phase
   
3. **Streaming**: Does OpenCode support streaming? Important for UX.
   - **NOTE**: Bash version captures full output, streaming is optional for MVP
   
4. **Context Window**: How much context can we send? May need truncation.
   - **ACTION**: Start without truncation, add if needed
   
5. **Error Handling**: What errors does OpenCode return? Need mapping.
   - **ACTION**: Implement graceful error handling during integration

## Critical Path to MVP

Based on current state (65 tests passing, tools implemented), the **critical path** is:

### Priority 1: OpenCode Integration (Highest)
1. Implement OpenCode client with subprocess execution
2. Parse tool call responses from OpenCode
3. Implement tool adapter to route calls to registry
4. Test end-to-end: prompt → OpenCode → tool execution → result

### Priority 2: Agent Loop (High)
1. Implement main execution loop
2. Add iteration limits and timeout protection
3. Implement progress tracking
4. Add error recovery logic

### Priority 3: Context & Prompting (High)
1. Implement prompt builder with system prompt
2. Add project context to prompts
3. Implement basic context manager
4. Format tool definitions for OpenCode

### Priority 4: Integration Testing (High)
1. Test `npm link` for global installation
2. Run smoke test end-to-end
3. Verify simple prompt execution
4. Validate MVP exit criteria

### Priority 5: Project Detection (Medium)
1. Basic project type detection (Node.js/Python/Go)
2. Simple .sheen/ initialization
3. Can defer advanced features post-MVP

**Estimated Effort**: With tools already implemented, 2-3 days of focused work to reach MVP.

## Next Steps

1. Create PLAN.md with detailed implementation plan
2. Refine task breakdown based on discoveries
3. Identify any blocking technical questions
4. Move to Planning phase

---

**DISCOVERY COMPLETE - Ready for Planning**

All project requirements understood, architecture designed, and implementation strategy defined. Ready to create detailed technical plan.
