# Quick Start Guide

## For the Current Sheen (Building Initial Version)

This directory contains comprehensive plans for building sheen v0.1.0.

### What's Here

- **plan.md** - Complete build plan with 10 phases and ~30 tasks
- **context.md** - Project architecture and design decisions
- **config.json** - Project settings and exit criteria
- **history.jsonl** - Execution log (will be populated during build)

### How to Use

1. **If you have a current version of sheen**: Just run `sheen --auto` from the project root
2. **If building manually**: Follow tasks in `plan.md` sequentially

### Exit Criteria

The current build process should exit when:
- ✅ `npm link` works and creates global `sheen` command
- ✅ `sheen --version` and `sheen --help` work
- ✅ Basic smoke test passes
- ✅ Can execute a simple prompt end-to-end

**Then switch to using the new sheen binary!**

### Key Tasks Overview

**Phase 1-2**: Foundation (project setup, CLI, config)
**Phase 3**: Project detection & auto-initialization
**Phase 4**: OpenCode integration
**Phase 5**: Tool system (file, git, shell)
**Phase 6**: Agent core logic (planner, loop, orchestrator)
**Phase 7**: I/O and user interaction
**Phase 8**: Polish and utilities
**Phase 9**: Testing and validation
**Phase 10**: Dogfooding - use sheen to build sheen!

### First Steps

1. Initialize package.json (Task 1.1)
2. Set up TypeScript (Task 1.1)
3. Create project structure (Task 1.2)
4. Build CLI entry point (Task 2.1-2.2)
5. Test global installation with `npm link`

### Questions?

Refer to:
- **plan.md** for detailed task breakdown
- **context.md** for architecture and design principles
- **config.json** for project settings

### Dogfooding Strategy

Once basic version works:
1. Exit the current build process
2. Run: `npm run build && npm link`
3. Test: `sheen --version`
4. Use sheen to add new features: `sheen "Add better error handling"`
5. Iterate and improve!

---

**Current Status**: Ready for implementation
**Next Task**: Task 1.1 - Initialize Node.js/TypeScript Project
