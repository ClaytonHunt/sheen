# Sheen Project Context

## Project Overview
Sheen is an autonomous coding agent with human oversight that operates as a global CLI tool. It can be called from anywhere, automatically detects project types, initializes planning structures, and executes development tasks with OpenCode integration.

## Project Type
**New Node.js/TypeScript CLI Application**

This is a greenfield project - no existing code yet.

## Target Environment
- **Runtime**: Node.js (v18+)
- **Language**: TypeScript with strict mode
- **Package Manager**: npm
- **Distribution**: npm global package

## Architecture Components

### Core Systems
1. **CLI Interface** - Global command-line tool using Commander.js
2. **Project Detection** - Auto-analyze project type, framework, structure
3. **Agent Loop** - Autonomous execution with OpenCode integration
4. **Tool System** - Built-in tools for file, git, and shell operations
5. **I/O Management** - Live user input, formatted output
6. **Planning System** - Task breakdown and progress tracking

### Key Technologies
- **Commander.js** - CLI argument parsing
- **Chalk** - Colored terminal output
- **Ora** - Spinners and progress indicators
- **Inquirer** - Interactive prompts
- **TypeScript** - Type safety and tooling
- **OpenCode** - LLM backend for agent intelligence

## Project Structure

```
sheen/
├── .sheen/                    # This planning directory
│   ├── plan.md               # Build plan (you are here!)
│   ├── context.md            # This file
│   └── config.json           # Project settings
├── package.json              # NPM package with bin config
├── tsconfig.json             # TypeScript configuration
├── src/
│   ├── index.ts             # Main entry point (#!/usr/bin/env node)
│   ├── cli.ts               # CLI parsing
│   ├── core/                # Agent logic
│   ├── io/                  # Input/output handling
│   ├── project/             # Project detection & initialization
│   ├── opencode/            # OpenCode integration
│   ├── tools/               # Built-in tools
│   ├── config/              # Configuration management
│   └── utils/               # Utilities
├── templates/               # Templates for .sheen/ initialization
└── tests/                   # Test files
```

## Design Principles

### 1. Global-First Design
- Install once (`npm install -g sheen`)
- Work from any directory
- No project-specific setup required

### 2. Smart Auto-Initialization
- Detect project type automatically
- Create `.sheen/` directory if missing
- Generate context-aware plans
- Work in empty directories (bootstrap new projects)

### 3. Autonomous with Oversight
- Run autonomously in loop
- Accept live user corrections
- Non-blocking input queue
- Graceful interruption (Ctrl+C)

### 4. Safety & Reversibility
- Warn before destructive operations
- Respect .gitignore patterns
- Log all actions to history.jsonl
- Resumable after interruption

### 5. OpenCode Integration
- Use OpenCode as LLM backend
- Provide tools via structured interface
- Stream responses for real-time feedback
- Maintain conversation context

## Configuration System

### Global Config (`~/.sheen/config.json`)
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

### Project Config (`.sheen/config.json`)
```json
{
  "maxIterations": 20,
  "autoApprove": false,
  "tools": ["file", "git", "shell"],
  "excludePatterns": ["node_modules", ".git", "dist"]
}
```

## Tool System

### Built-in Tools

**File Tools**:
- `read_file` - Read file contents
- `write_file` - Create/overwrite files
- `edit_file` - Edit specific sections
- `delete_file` - Remove files
- `list_files` - Directory listing
- `search_files` - Content search

**Git Tools**:
- `git_status` - Repository status
- `git_diff` - Show changes
- `git_commit` - Create commits
- `git_branch` - Branch operations
- `git_log` - History

**Shell Tools**:
- `shell_exec` - Execute commands with timeout

### Custom Tools
Users can add custom tools in `.sheen/tools/` directory.

## Execution Flow

```
1. User runs: sheen "prompt"
   ↓
2. Detect project context
   - Check for .sheen/ directory
   - Analyze project files
   - Determine project type
   ↓
3. Initialize/load .sheen/
   - Create if missing
   - Load existing plan
   - Generate context
   ↓
4. Plan tasks
   - Break down user prompt
   - Create task list
   - Set priorities
   ↓
5. Execute loop
   - Get next task
   - Send to OpenCode
   - Receive tool calls
   - Execute tools
   - Update progress
   - Check for user input
   - Repeat
   ↓
6. Complete or pause
   - Save state
   - Show summary
   - Exit gracefully
```

## User Interaction Patterns

### Starting Modes

**Direct Prompt**:
```bash
sheen "Add user authentication"
```

**Auto-Resume**:
```bash
sheen --auto
# Continues from .sheen/plan.md
```

**Initialize Only**:
```bash
sheen init
# Creates .sheen/ without executing
```

### Live Input During Execution
```bash
[Task 2/5] Installing dependencies...
> Use yarn instead of npm
🤖 Updated - switching to yarn...
```

### Control Commands
- `pause` - Pause execution
- `resume` - Resume execution
- `stop` - Stop and exit
- `status` - Show current progress
- `help` - Show available commands

## OpenCode Integration Details

### Communication Pattern
```
Sheen ←→ OpenCode
  ↓         ↓
Tools    LLM Intelligence
```

### Request Format (to OpenCode)
```json
{
  "prompt": "Task description with context",
  "tools": [...available tools...],
  "context": {
    "project": {...},
    "history": [...]
  }
}
```

### Response Format (from OpenCode)
```json
{
  "tool_calls": [
    {
      "tool": "read_file",
      "parameters": {"path": "package.json"}
    }
  ],
  "thinking": "...",
  "next_action": "..."
}
```

## Dependencies

### Production
- `commander` - CLI parsing
- `chalk` - Terminal colors
- `ora` - Spinners
- `inquirer` - Interactive prompts
- `dotenv` - Environment config

### Development
- `typescript` - Type system
- `tsx` - TypeScript execution
- `@types/node` - Node.js types
- `@types/inquirer` - Inquirer types

## Success Criteria

The project is ready for dogfooding when:

1. ✅ **Global Installation Works**
   - `npm link` succeeds
   - `sheen` command available globally
   - Works from any directory

2. ✅ **Basic Operations Work**
   - Can parse prompts
   - Detects project types
   - Initializes .sheen/ correctly
   - Executes simple tasks

3. ✅ **OpenCode Integration Works**
   - Sends prompts successfully
   - Receives and executes tool calls
   - Maintains conversation context

4. ✅ **User Interaction Works**
   - Formatted output displays correctly
   - Live input queue functions
   - Graceful shutdown on Ctrl+C

5. ✅ **Resumability Works**
   - Can pause and resume
   - Loads previous state correctly
   - History tracking functional

6. ✅ **Smoke Test Passes**
   - Run in test directory
   - Execute simple task
   - Verify results

## Development Workflow

### Phase 1: Foundation
Get basic structure in place - project setup, CLI, config system.

### Phase 2: Detection & Initialization
Build smart project detection and .sheen/ auto-initialization.

### Phase 3: OpenCode Integration
Connect to OpenCode, implement tool call handling.

### Phase 4: Core Loop
Build the autonomous execution loop.

### Phase 5: Polish & Testing
Add output formatting, input handling, testing.

### Phase 6: Dogfooding
Use sheen to build sheen - the ultimate test!

## Notes & Considerations

### Open Questions
- Exact OpenCode API format (HTTP/subprocess/SDK?)
- Streaming support for real-time output?
- Best way to handle long-running tool calls?
- Error recovery strategies?

### Future Enhancements (Post-MVP)
- Plugin system for custom tools
- Web UI for monitoring
- Team collaboration features
- Cloud state sync
- Integration with GitHub Actions
- Multiple agent coordination

### Testing Strategy
- Start with smoke tests
- Manual testing in various project types
- Dogfooding as primary validation
- Add unit tests incrementally

## Conventions

### Code Style
- TypeScript strict mode
- Async/await (no callbacks)
- Functional where possible
- Clear error handling
- Descriptive variable names

### Commit Messages
- Use conventional commits
- Start with verb: "Add", "Update", "Fix"
- Reference task numbers from plan.md

### File Organization
- One class/component per file
- Index files for clean exports
- Group by feature, not by type
- Keep utils generic and reusable

---

**Last Updated**: Initial creation
**Status**: Ready for implementation
**Next Step**: Task 1.1 - Initialize Node.js/TypeScript project
