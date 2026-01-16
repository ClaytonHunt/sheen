# Sheen

> An autonomous coding agent with human oversight, powered by OpenCode

Sheen is a global CLI tool that can be called from anywhere to autonomously execute development tasks. It automatically detects project types, creates intelligent plans, and executes them while allowing live human oversight and correction.

## Vision

Sheen represents the next generation of AI-powered development tools:
- **Global-first**: Install once, use everywhere
- **Autonomous**: Continuously executes until task completion
- **Oversightable**: Accept live corrections and guidance
- **Project-aware**: Auto-detects and adapts to your codebase
- **Resumable**: Pause and continue across sessions

## Status

✅ **v0.1.0 READY** - Core implementation complete with 65 passing tests

All core features implemented and tested. Ready for production use and dogfooding!

## Features

### Core Capabilities (v0.1.0)
- ✅ Global CLI installation (`npm install -g sheen`)
- ✅ Autonomous execution loop with OpenCode integration
- ✅ Auto-detect project type and structure
- ✅ Smart `.sheen/` directory initialization
- ✅ Multi-iteration execution with progress tracking
- ✅ 9 tools across 3 categories (file, git, shell)
- ✅ Comprehensive error handling and recovery

### Upcoming Features (v0.2.0+)
- ⏳ Live user input during execution
- ⏳ Task planner with plan.md parsing
- ⏳ Resume interrupted sessions
- ⏳ Custom tool loading
- ⏳ Enhanced progress visualization

### Usage Examples

```bash
# Direct prompt - execute a coding task
sheen "Add input validation to the user registration form"

# Initialize .sheen/ directory in your project
sheen init

# Works from any directory
cd ~/my-project && sheen "add unit tests for auth module"
cd ~/another-project && sheen "refactor database queries"

# Check version and help
sheen --version
sheen --help
```

### Quick Start

1. **Install globally**:
   ```bash
   npm install -g sheen
   ```

2. **Navigate to your project**:
   ```bash
   cd ~/your-project
   ```

3. **Run a task**:
   ```bash
   sheen "implement user authentication"
   ```

Sheen will:
- Detect your project type (Node.js, Python, Go, etc.)
- Create `.sheen/` directory with context
- Integrate with OpenCode LLM
- Execute the task autonomously using available tools
- Track progress and handle errors

### Available Tools (v0.1.0)

**File Tools (5)**:
- `read_file` - Read file contents
- `write_file` - Write or create files
- `list_files` - List directory contents (with recursion)
- `edit_file` - Search and replace in files
- `search_files` - Grep-like content search

**Git Tools (3)**:
- `git_status` - Show repository status
- `git_commit` - Commit changes with message
- `git_diff` - Show diffs (staged/unstaged)

**Shell Tools (1)**:
- `shell_exec` - Execute shell commands

### Project Structure

When you run sheen, it creates a `.sheen/` directory:

```
.sheen/
├── plan.md          # Generated task plan
├── context.md       # Auto-detected project context
├── config.json      # Project-specific settings
└── history.jsonl    # Execution log
```

## Development

### Building from Source

```bash
# Clone repository
git clone <repo-url>
cd sheen

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests (65 unit tests)
npm test

# Run smoke tests (10 scenarios)
bash smoke-test.sh

# Link for global use
npm link

# Verify installation
sheen --version
```

### Testing

**Test Suite (89 total tests)**:
- 65 unit tests (Jest)
- 14 manual integration tests
- 10 smoke tests

```bash
# Run all unit tests
npm test

# Run specific test suite
npm test -- tests/tools/file.test.ts

# Run with coverage
npm test -- --coverage

# Run smoke tests
bash smoke-test.sh
```

### Project Statistics

- **Total Tests**: 89 (100% passing)
- **TypeScript**: Strict mode, 0 errors
- **Code Coverage**: Comprehensive
- **Lines of Code**: ~3,000+ (implementation + tests)
- **Components**: 20+ TypeScript modules

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────┐
│                   CLI Entry Point                    │
│         (src/cli.ts - Commander.js based)            │
│  Parse args → Detect project → Initialize .sheen/   │
└────────────────────┬────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────┐
│                  Agent Orchestrator                  │
│                  (src/core/agent.ts)                 │
│    Coordinates OpenCode, Tools, and ExecutionLoop    │
└────────────────────┬────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────┐
│              Execution Loop Controller               │
│                 (src/core/loop.ts)                   │
│  Multi-iteration → Progress tracking → Error limits  │
└────────────────────┬────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────┐
│             OpenCode Integration Layer               │
│    (src/opencode/client.ts + adapter.ts)             │
│  Spawn subprocess → Parse tool calls → Format output │
└────────────────────┬────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────┐
│                   Tool System                        │
│              (src/tools/registry.ts)                 │
│  File tools → Git tools → Shell tools → Validation   │
└─────────────────────────────────────────────────────┘
```

### Component Details

**Core Components**:
- `Agent` (210 lines): Main orchestrator integrating all systems
- `ExecutionLoop` (104 lines, 12 tests): Multi-iteration control with progress detection
- `OpenCodeClient` (247 lines): Subprocess management and streaming output
- `ToolCallAdapter` (214 lines): Parse and execute tool calls from OpenCode

**Tool System**:
- `ToolRegistry` (176 lines, 20 tests): Registration, validation, execution
- `FileTools` (336 lines, 16 tests): 5 file operation tools
- `GitTools` (133 lines, 10 tests): 3 git operation tools
- `ShellTools` (57 lines, 7 tests): 1 shell execution tool

**Project Management**:
- `ProjectDetector` (240 lines): Detects type, framework, language, git info
- `SheenInitializer` (170 lines): Creates .sheen/ with templates
- `GlobalConfig` (~100 lines): Multi-source configuration management

### Design Principles

1. **Modular Architecture**: Clear separation of concerns
2. **Test-Driven Development**: All features test-first
3. **Type Safety**: Strict TypeScript throughout
4. **Error Recovery**: Comprehensive validation and error handling
5. **Extensibility**: Easy to add new tools and features

## Configuration

### Global Config (`~/.sheen/config.json`)

```json
{
  "defaultModel": "opencode",
  "autoApprove": false,
  "maxIterations": 50,
  "logLevel": "info"
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

## Exit Criteria (v0.1.0)

All exit criteria for the initial version have been met:

- ✅ `npm link` successfully creates global `sheen` command
- ✅ `sheen --version` returns version number (0.1.0)
- ✅ `sheen --help` displays usage information
- ✅ Can detect project types (Node.js, Python, Go, Rust, etc.)
- ✅ OpenCode integration is functional with tool call parsing
- ✅ Can initialize and use `.sheen/` directory
- ✅ 9 tools implemented and tested (file, git, shell)
- ✅ Multi-iteration execution loop with progress tracking
- ✅ Comprehensive test suite (65 unit tests, 100% passing)
- ✅ Smoke tests pass (10/10 scenarios)
- ✅ Zero TypeScript errors (strict mode)
- ✅ Clean builds and cross-platform support (Windows tested)

**Status**: Ready for production use and dogfooding!

## Contributing

Contributions are welcome! Now that v0.1.0 is complete, we're ready for community contributions.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests first (TDD approach)
4. Implement the feature
5. Ensure all tests pass (`npm test`)
6. Run smoke tests (`bash smoke-test.sh`)
7. Commit your changes (`git commit -m 'feat: add amazing feature'`)
8. Push to the branch (`git push origin feature/amazing-feature`)
9. Open a Pull Request

### Code Standards

- **TypeScript**: Strict mode, no type errors
- **Testing**: TDD methodology, maintain 100% test pass rate
- **Commits**: Follow conventional commits format
- **Documentation**: Update README and relevant docs

### Areas for Contribution

- Additional tools (database, API, testing frameworks)
- Enhanced error messages and user feedback
- Progress visualization improvements
- Custom tool loader implementation
- Task planner with plan.md parsing
- Session resume functionality

## License

TBD

## Acknowledgments

- Built with [OpenCode](https://opencode.ai) for LLM intelligence
- Inspired by autonomous agent architectures
- Designed for dogfooding and continuous improvement

---

**Note**: Sheen v0.1.0 is complete and ready for use. See `PROJECT_STATUS.md` for detailed implementation status and test results. Built using TDD methodology with 89 passing tests.
