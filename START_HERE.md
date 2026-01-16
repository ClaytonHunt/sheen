# 🚀 Start Here - Building Sheen

Perfect! Everything is ready for you (or the current sheen) to start building.

## What You Have Now

### Planning Documents (`.sheen/`)
- **plan.md** (18KB) - Complete 10-phase build plan with ~30 detailed tasks
- **context.md** (9KB) - Architecture, design principles, and technical decisions
- **config.json** - Project settings with exit criteria
- **history.jsonl** - Execution log template
- **QUICK_START.md** - Quick reference guide

### Reference Implementation
- **sheen.sh** (30KB, 774 lines) - Working bash version from AdventureEngine
  - Autonomous loop with phase management (lines 587-722)
  - OpenCode integration (lines 404-498)
  - Error recovery (lines 287-310)
  - Phase detection (lines 312-402)
  - Progress tracking (lines 230-285)

### Configuration
- **.sheenconfig** - Configuration for sheen execution
  - Max iterations: 100
  - Phase timeouts configured
  - Auto-commit enabled
  - Error recovery settings

### Documentation
- **PROMPT.md** - Your working prompt for building sheen
- **PROMPT.md.example** - Reference from AdventureEngine
- **README.md** - Project overview
- **GETTING_STARTED.md** - How to proceed guide

## How to Start Building

### Option 1: Use Current Sheen (Bash Version)

If you have the bash version of sheen working:

```bash
cd D:\projects\sheen
./sheen.sh
```

The script will:
1. Read PROMPT.md
2. Follow .sheen/plan.md
3. Execute tasks autonomously
4. Commit after each milestone

### Option 2: Use OpenCode Directly

```bash
# Start with the prompt
opencode run "$(cat PROMPT.md)"

# Or target specific tasks
opencode run "Implement Task 1.1 from .sheen/plan.md - Initialize Node.js/TypeScript project"
```

### Option 3: Manual Implementation

Follow `.sheen/plan.md` sequentially, starting with:

**Task 1.1: Initialize Node.js/TypeScript Project**
1. Create package.json with bin field
2. Add dependencies (Commander, Chalk, Ora, TypeScript, etc.)
3. Create tsconfig.json
4. Add build scripts
5. Create .gitignore

## Exit Criteria - When to Stop

Stop the current build process when:
- ✅ `npm link` creates global `sheen` command
- ✅ `sheen --version` returns version
- ✅ `sheen --help` shows usage
- ✅ Basic smoke test passes
- ✅ Can execute a simple prompt end-to-end

**Then switch to using the new sheen binary for all future development!**

## Key Files Map

```
sheen/
├── START_HERE.md           ← You are here!
├── PROMPT.md               ← Active prompt for OpenCode
├── sheen.sh                ← Reference bash implementation
├── .sheenconfig            ← Config for execution
│
├── .sheen/                 ← Planning directory
│   ├── plan.md            ← 10-phase detailed plan
│   ├── context.md         ← Architecture guide
│   ├── config.json        ← Project settings
│   ├── QUICK_START.md     ← Quick reference
│   └── history.jsonl      ← Execution log
│
├── GETTING_STARTED.md     ← Detailed getting started
├── README.md              ← Project overview
└── PROMPT.md.example      ← AdventureEngine reference
```

## First Steps Checklist

- [ ] Read PROMPT.md to understand your mission
- [ ] Review .sheen/plan.md for task breakdown
- [ ] Check .sheen/context.md for architecture
- [ ] Look at sheen.sh to see reference implementation
- [ ] Start with Task 1.1 (package.json, tsconfig)
- [ ] Commit after each task completion
- [ ] Test frequently with `npm run dev`
- [ ] Use `npm link` when ready to test globally

## Build Phases Overview

| Phase | Focus | Status |
|-------|-------|--------|
| 1 | Project Setup | 🎯 START HERE |
| 2 | CLI & Config | ⏳ Next |
| 3 | Project Detection | ⏳ Next |
| 4 | OpenCode Integration | ⏳ Next |
| 5 | Tool System | ⏳ Next |
| 6 | Agent Core | ⏳ Next |
| 7 | I/O | ⏳ Next |
| 8 | Utilities | ⏳ Next |
| 9 | Testing | ⏳ Next |
| 10 | Dogfooding | 🎉 Final |

## What Makes This Special

This is **dogfooding at its finest**:

1. We have a working bash version (sheen.sh)
2. We're building a better Node.js/TypeScript version
3. The new version will replace itself
4. Then we'll use the new sheen to improve sheen!

It's sheen all the way down. 🐢

## Need Help?

- **Stuck?** Check `.sheen/context.md` for design decisions
- **Lost?** Review `.sheen/plan.md` for roadmap
- **Confused about features?** Look at `sheen.sh` reference
- **Want examples?** See `PROMPT.md.example` from AdventureEngine

## Ready?

```bash
# Let's build sheen! Pick one:

# Option 1: Bash sheen
./sheen.sh

# Option 2: OpenCode directly
opencode run "$(cat PROMPT.md)"

# Option 3: Manual
# Read .sheen/plan.md and start with Task 1.1
```

---

**Remember:** Once basic version works, switch to using it immediately. That's the whole point! 🚀
