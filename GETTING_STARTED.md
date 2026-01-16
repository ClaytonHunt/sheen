# Getting Started with Sheen Development

## What You Have Now

The `.sheen/` directory is fully set up and ready for the current version of sheen to start building!

### Files Created

```
.sheen/
├── plan.md           # Complete build plan (10 phases, ~30 tasks)
├── context.md        # Architecture and design decisions  
├── config.json       # Project settings and exit criteria
├── history.jsonl     # Execution log (will populate during build)
└── QUICK_START.md    # Quick reference guide
```

Plus:
- `README.md` - Project overview and documentation

## How to Proceed

### Option 1: Use Current Sheen (Recommended for Dogfooding)

If you have a working version of sheen:

```bash
cd D:\projects\sheen
sheen --auto
```

This will automatically load `.sheen/plan.md` and start executing tasks.

### Option 2: Use OpenCode Directly

You can also use OpenCode to work through the plan:

```bash
# Read the plan
cat .sheen/plan.md

# Ask OpenCode to execute specific tasks
opencode "Implement Task 1.1 from .sheen/plan.md"
```

### Option 3: Manual Implementation

Follow tasks sequentially from `.sheen/plan.md`:

1. **Task 1.1**: Initialize package.json and tsconfig.json
2. **Task 1.2**: Create project structure
3. **Task 2.1**: Implement CLI entry point
4. And so on...

## Exit Criteria

Stop the current build process when:

- ✅ Global `sheen` command works (`npm link` succeeds)
- ✅ `sheen --version` outputs version
- ✅ `sheen --help` shows usage
- ✅ Basic smoke test passes
- ✅ Can execute simple prompts end-to-end

**Then switch to using the new sheen for all future development!**

## Build Phases Overview

| Phase | Focus | Key Tasks |
|-------|-------|-----------|
| 1 | Project Setup | package.json, tsconfig, structure |
| 2 | CLI & Config | Argument parsing, configuration system |
| 3 | Project Detection | Auto-detect types, initialize .sheen/ |
| 4 | OpenCode Integration | API client, tool adapter |
| 5 | Tool System | File, git, shell operations |
| 6 | Agent Core | Planner, execution loop, orchestrator |
| 7 | I/O | Output formatting, live input |
| 8 | Utilities | Logger, types, polish |
| 9 | Testing | Smoke tests, validation |
| 10 | Dogfooding | Use sheen to build sheen! |

## Quick Commands

```bash
# Start development
npm install
npm run dev

# Build for production
npm run build

# Link globally
npm link

# Test global command
sheen --version

# Start building with auto mode
sheen --auto
```

## Architecture at a Glance

```
CLI → Detect Project → Load/Init .sheen/ → Plan Tasks → Execute Loop
                                                ↓
                                          OpenCode ← Tools
                                                ↓
                                          Update Progress → Continue/Pause
```

## Key Design Principles

1. **Global-first**: Works from any directory
2. **Auto-initialize**: Creates .sheen/ automatically  
3. **Project-aware**: Detects types and adapts
4. **Resumable**: Can pause and continue
5. **Autonomous with oversight**: Runs independently but accepts live input

## Next Steps

1. Review `.sheen/plan.md` for detailed tasks
2. Check `.sheen/context.md` for architecture details
3. Start with Phase 1: Project Setup
4. Build incrementally and test frequently
5. Switch to new sheen once basic version works
6. Dogfood from then on!

## Need Help?

- **Detailed plan**: `.sheen/plan.md`
- **Architecture**: `.sheen/context.md`
- **Configuration**: `.sheen/config.json`
- **Quick reference**: `.sheen/QUICK_START.md`

---

**Ready to build sheen with sheen!** 🚀
