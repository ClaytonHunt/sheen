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

🚧 **Under Construction** - Currently building the initial version

This README will be updated as features are implemented.

## Planned Features

### Core Capabilities
- ✅ Global CLI installation (`npm install -g sheen`)
- ⏳ Autonomous execution loop with OpenCode integration
- ⏳ Auto-detect project type and structure
- ⏳ Smart `.sheen/` directory initialization
- ⏳ Live user input during execution
- ⏳ Task planning and progress tracking
- ⏳ Resume interrupted sessions

### Usage Patterns

```bash
# Direct prompt
sheen "Add user authentication with JWT"

# Auto-resume from plan
sheen --auto

# Continue previous session
sheen --continue

# Initialize .sheen/ directory
sheen init

# Works in any directory
cd ~/my-project && sheen "add tests"
cd ~/another-project && sheen "refactor API"
```

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

This project is being built using dogfooding principles - we'll use sheen to build sheen once the basic version is working.

### Current Phase

**Phase 1: Foundation**
- Setting up project structure
- Implementing CLI interface
- Building core systems

See `.sheen/plan.md` for detailed build plan.

### Building from Source

```bash
# Clone repository
git clone <repo-url>
cd sheen

# Install dependencies
npm install

# Build TypeScript
npm run build

# Link for global use
npm link

# Verify installation
sheen --version
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   CLI Entry Point                    │
│  Parse args → Detect project → Initialize .sheen/   │
└────────────────────┬────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────┐
│              Task Planner & Manager                  │
│  Break down prompts → Create tasks → Track progress │
└────────────────────┬────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────┐
│           Autonomous Agent Loop + OpenCode           │
│  Execute tasks → Call tools → Update state → Loop   │
│  Accept live user input for corrections/guidance    │
└─────────────────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────┐
│                   Tool System                        │
│  File ops → Git ops → Shell commands → Custom tools │
└─────────────────────────────────────────────────────┘
```

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

## Exit Criteria

This initial version will be considered ready when:

- ✅ `npm link` successfully creates global `sheen` command
- ✅ `sheen --version` returns version number
- ✅ `sheen --help` displays usage information
- ✅ Can execute a basic prompt end-to-end
- ✅ OpenCode integration is functional
- ✅ Can initialize and use `.sheen/` directory
- ✅ Smoke tests pass

**At that point, we'll switch to using the new sheen to build sheen!**

## Contributing

Once the initial version is ready, contributions will be welcome. Guidelines TBD.

## License

TBD

## Acknowledgments

- Built with [OpenCode](https://opencode.ai) for LLM intelligence
- Inspired by autonomous agent architectures
- Designed for dogfooding and continuous improvement

---

**Note**: This project is in active development. The above represents the planned functionality. Check `.sheen/plan.md` for current implementation status.
