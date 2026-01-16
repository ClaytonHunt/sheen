# Discovery Phase: Sheen v0.1.0 - Bug Fixes and Enhancements

**Date**: January 16, 2026  
**Updated**: January 16, 2026 (Bug fix analysis)  
**Phase**: Post-MVP Bug Fixes  
**Status**: DISCOVERY IN PROGRESS

## Current State Analysis

### Project Overview
Sheen v0.1.0 is **COMPLETE** with all core features implemented and tested:
- ✅ 65 passing unit tests
- ✅ 9 working tools (file, git, shell)
- ✅ Full OpenCode integration
- ✅ Project detection and initialization
- ✅ Multi-iteration execution loop
- ✅ Comprehensive test suite

### Identified Issues

Based on user feedback and testing, three bugs/enhancements need to be addressed:

#### 1. Missing ASCII Header in NPM Version
**Issue**: When running `sheen --version`, it only outputs the version number `0.1.0` without the ASCII art header that makes it visually appealing.

**Current Behavior**:
```bash
$ sheen --version
0.1.0
```

**Expected Behavior**:
```bash
$ sheen --version
   _____ __                  
  / ___// /_  ___  ___  ____ 
  \__ \/ __ \/ _ \/ _ \/ __ \
 ___/ / / / /  __/  __/ / / /
/____/_/ /_/\___/\___/_/ /_/ 
                              
v0.1.0 - Autonomous coding agent
```

**Root Cause**: The CLI uses Commander.js's built-in `.version()` method which only outputs the version string. We need to override this behavior to display a custom version output with ASCII art.

**Location**: `src/cli.ts:11-14`

**Fix Approach**:
1. Create ASCII art header (can use figlet or pre-generated art)
2. Override Commander's version display using a custom action
3. Ensure it works in the compiled npm package

---

#### 2. Verbose Mode Not Working
**Issue**: The `--verbose` or `-v` flag is defined but verbose logging doesn't appear to be working as expected.

**Current Behavior**:
```bash
$ sheen --verbose "test prompt"
[INFO] 🚀 Sheen starting... 
[INFO] 📂 Detecting project... 
# Only INFO level logs shown, no DEBUG logs
```

**Expected Behavior**:
```bash
$ sheen --verbose "test prompt"
[DEBUG] CLI arguments parsed: { prompt: 'test prompt', verbose: true }
[INFO] 🚀 Sheen starting...
[DEBUG] Loading global config from ~/.sheen/config.json
[INFO] 📂 Detecting project...
[DEBUG] Checking for package.json...
[DEBUG] Found package.json, detected nodejs
# All DEBUG and INFO logs shown
```

**Root Cause Investigation**:
1. The flag is passed to `Logger` constructor: `new Logger(options.verbose ? 'debug' : 'info')`
2. Need to check if `Logger` class properly filters/displays debug messages
3. Need to verify the verbose flag is propagated throughout the execution

**Location**: 
- `src/cli.ts:26` - Logger initialization
- `src/utils/logger.ts` - Logger implementation

**Fix Approach**:
1. Review `Logger.debug()` implementation
2. Ensure log level filtering works correctly
3. Add debug logs throughout the codebase
4. Test verbose mode end-to-end

---

#### 3. Auto Mode When No Prompt Provided
**Issue**: When sheen is run without a prompt, it should assume auto mode (reading from `.sheen/plan.md`) until live prompt functionality is built.

**Current Behavior**:
```bash
$ sheen
📝 No prompt provided. Use: sheen "your task here"
# Exits without doing anything
```

**Expected Behavior**:
```bash
$ sheen
📝 No prompt provided, assuming auto mode
📋 Loading plan from .sheen/plan.md...
✓ Found 3 pending tasks
🤖 Starting agent in auto mode...
# Executes tasks from plan.md
```

**Root Cause**: The CLI checks for a prompt and exits if none is provided, instead of falling back to auto mode.

**Location**: `src/cli.ts:65-82`

**Fix Approach**:
1. When no prompt is provided, check if `.sheen/plan.md` exists
2. If it exists, load tasks from the plan
3. Pass those tasks to the agent for execution
4. If no plan exists, show a helpful error message suggesting `sheen init`

---

## Technical Investigation

### Issue #1: ASCII Header - Implementation Details

**Research**:
- Commander.js `.version()` method only accepts a string
- Need to use `.addCommand()` or custom action to override
- ASCII art generation: Use `figlet` package or pre-baked string

**Design Decision**: Pre-baked ASCII art string
- **Pros**: No external dependency, faster startup, guaranteed formatting
- **Cons**: Manual creation required

**Implementation Plan**:
1. Create `src/io/banner.ts` with ASCII art constant
2. Modify `src/cli.ts` to use custom version action
3. Display banner before version number

**Code Snippet**:
```typescript
// src/io/banner.ts
export const BANNER = `
   _____ __                  
  / ___// /_  ___  ___  ____ 
  \__ \/ __ \/ _ \/ _ \/ __ \\
 ___/ / / / /  __/  __/ / / /
/____/_/ /_/\\___/\\___/_/ /_/ 
`;

export function showVersion(version: string) {
  console.log(BANNER);
  console.log(`v${version} - Autonomous coding agent\n`);
}

// src/cli.ts
program
  .version('0.1.0', '-v, --version', 'Show version')
  .action(() => {
    showVersion('0.1.0');
    process.exit(0);
  });
```

---

### Issue #2: Verbose Mode - Investigation

Let me check the Logger implementation:

**Current Logger Code** (from `src/utils/logger.ts`):
```typescript
export class Logger {
  constructor(private logLevel: string) {}
  
  debug(message: string, meta?: any): void {
    if (this.logLevel === 'debug') {
      console.log(`[DEBUG] ${message}`, meta || '');
    }
  }
  
  info(message: string, meta?: any): void {
    console.log(`[INFO] ${message}`, meta || '');
  }
  
  // ...
}
```

**Problem Found**: 
1. The Logger implementation likely only outputs DEBUG when level is 'debug'
2. But no DEBUG logs are being called throughout the codebase
3. Need to add debug logging statements in key areas

**Solution**:
1. Add debug logs to critical paths:
   - CLI argument parsing
   - Config loading
   - Project detection steps
   - Tool execution
   - OpenCode communication
2. Ensure Logger is passed through to all components

**Locations to Add Debug Logs**:
- `src/cli.ts` - Argument parsing
- `src/config/global.ts` - Config loading
- `src/project/detector.ts` - Detection logic
- `src/core/agent.ts` - Agent initialization
- `src/opencode/client.ts` - OpenCode calls
- `src/tools/index.ts` - Tool execution

---

### Issue #3: Auto Mode - Design

**Current Flow**:
```
CLI parse args → if no prompt → show message and exit
```

**Desired Flow**:
```
CLI parse args → if no prompt → check for .sheen/plan.md
                               → if exists → load and execute
                               → if not → suggest init
```

**Implementation Details**:

1. **Check for plan.md**:
```typescript
// In src/cli.ts action handler
if (!prompt && !options.auto) {
  // Check if .sheen/plan.md exists
  const planPath = path.join(process.cwd(), '.sheen', 'plan.md');
  if (await fs.access(planPath).then(() => true).catch(() => false)) {
    logger.info('📝 No prompt provided, assuming auto mode');
    options.auto = true;
  } else {
    logger.info('📝 No prompt or plan found. Use: sheen init');
    return;
  }
}
```

2. **Load plan when in auto mode**:
```typescript
if (options.auto) {
  logger.info('📋 Loading plan from .sheen/plan.md...');
  // Load tasks from plan.md
  // Pass to agent for execution
}
```

3. **Parse plan.md format**:
Current `.sheen/plan.md` format (from templates):
```markdown
# Sheen Execution Plan

## Tasks

### Task task_123 🔄
**Description**: Task description
**Status**: pending
...
```

Need to parse this and convert to Task objects.

**Alternative Approach**: Use the existing TaskPlanner class if it has load functionality.

---

## Architecture Decisions

### Verbose Logging Strategy
**Decision**: Add strategic debug logs throughout the codebase without being overly verbose.

**Guidelines**:
1. Log at decision points (if/else branches)
2. Log before/after external calls (OpenCode, git, shell)
3. Log configuration loading and merging
4. Log file I/O operations
5. Keep debug messages concise and informative

**Example**:
```typescript
logger.debug(`Loading config from ${configPath}`);
logger.debug(`Merged config: maxIterations=${config.maxIterations}`);
```

---

### Auto Mode Implementation
**Decision**: When no prompt is provided, automatically enter auto mode if `.sheen/plan.md` exists.

**Reasoning**:
1. Reduces friction - users don't need to remember `--auto` flag
2. Makes sheen more autonomous - "just run sheen"
3. Graceful degradation - shows helpful message if no plan exists
4. Aligns with vision of autonomous agent

**User Experience**:
```bash
# Scenario 1: No plan exists
$ sheen
📝 No prompt or plan found
💡 Initialize with: sheen init
   Or provide a prompt: sheen "your task"

# Scenario 2: Plan exists
$ sheen
📝 No prompt provided, entering auto mode
📋 Loading plan from .sheen/plan.md...
✓ Found 3 pending tasks
🤖 Starting agent...
[continues execution]

# Scenario 3: Explicit prompt
$ sheen "add tests"
🤖 Starting agent...
📝 Prompt: "add tests"
[executes prompt]
```

---

## Implementation Plan

### Priority Order
1. **Issue #3 (Auto Mode)** - HIGHEST PRIORITY
   - Most impactful for user experience
   - Relatively straightforward implementation
   - ~30 minutes

2. **Issue #1 (ASCII Header)** - HIGH PRIORITY
   - Quick win, improves branding
   - ~20 minutes

3. **Issue #2 (Verbose Mode)** - MEDIUM PRIORITY
   - Requires adding debug logs throughout
   - More time-consuming but valuable
   - ~1-2 hours

---

### Task Breakdown

#### Task 1: Implement Auto Mode (30 min)
**Files to modify**:
- `src/cli.ts` - Add auto mode logic

**Steps**:
1. Add helper function to check if `.sheen/plan.md` exists
2. Modify action handler to enter auto mode when no prompt
3. Test with existing .sheen/ directory
4. Test without .sheen/ directory

**Acceptance Criteria**:
- `sheen` with no args enters auto mode if plan exists
- Shows helpful message if no plan exists
- Works the same as `sheen --auto`

---

#### Task 2: Add ASCII Header (20 min)
**Files to create/modify**:
- `src/io/banner.ts` - New file with ASCII art
- `src/cli.ts` - Override version command

**Steps**:
1. Generate ASCII art for "Sheen"
2. Create banner.ts with showVersion function
3. Override Commander's version action
4. Test with `sheen --version`

**Acceptance Criteria**:
- `sheen --version` shows ASCII header + version
- `sheen -v` also works
- Works in compiled npm package

---

#### Task 3: Fix Verbose Mode (1-2 hours)
**Files to modify**:
- `src/utils/logger.ts` - Verify implementation
- `src/cli.ts` - Add debug logs
- `src/config/global.ts` - Add debug logs
- `src/project/detector.ts` - Add debug logs
- `src/core/agent.ts` - Add debug logs
- `src/opencode/client.ts` - Add debug logs

**Steps**:
1. Review and fix Logger.debug() if needed
2. Add debug logs to CLI argument parsing
3. Add debug logs to config loading
4. Add debug logs to project detection
5. Add debug logs to agent execution
6. Test with `--verbose` flag

**Acceptance Criteria**:
- `sheen --verbose "task"` shows DEBUG logs
- Debug logs are informative and not overwhelming
- Regular mode (no --verbose) shows only INFO logs

---

## Testing Strategy

### Unit Tests
- **Auto Mode**: Test CLI logic for auto mode detection
- **ASCII Header**: Test banner output
- **Verbose Mode**: Test Logger with different log levels

### Integration Tests
1. Test `sheen` with no args in directory with plan
2. Test `sheen` with no args in directory without plan
3. Test `sheen --version` shows header
4. Test `sheen --verbose "task"` shows debug logs

### Manual Testing Checklist
- [ ] Run `sheen --version` - see ASCII header
- [ ] Run `sheen` in project with plan - auto mode starts
- [ ] Run `sheen` in empty dir - helpful message shown
- [ ] Run `sheen --verbose "test"` - debug logs visible
- [ ] Run `sheen "test"` - only info logs visible

---

## Success Criteria

### Issue #1: ASCII Header
✅ `sheen --version` displays ASCII art banner
✅ `sheen -v` works the same way
✅ Works in compiled npm package

### Issue #2: Verbose Mode
✅ `sheen --verbose` shows DEBUG level logs
✅ Debug logs added to all key components
✅ Regular mode only shows INFO+ logs
✅ Logs are clear and helpful

### Issue #3: Auto Mode
✅ `sheen` with no prompt enters auto mode if plan exists
✅ Shows helpful message if no plan exists
✅ Loads and executes tasks from plan.md
✅ Works identically to `sheen --auto`

---

## Risk Assessment

### Low Risk Changes
- **ASCII Header**: Isolated change, minimal impact
- **Auto Mode Logic**: Simple conditional, well-defined behavior

### Medium Risk Changes
- **Verbose Logging**: Need to ensure performance not impacted
- **Plan Loading**: Need to ensure plan.md parsing is robust

### Mitigation
1. Test all changes thoroughly
2. Keep changes isolated to specific files
3. Add unit tests where possible
4. Manual test end-to-end scenarios

---

## Dependencies

**None** - All three issues can be fixed with existing dependencies:
- chalk (already installed)
- commander (already installed)
- fs/path (built-in)

No new npm packages required.

---

## Timeline

**Total Estimated Time**: 2-3 hours

- Issue #3 (Auto Mode): 30 minutes
- Issue #1 (ASCII Header): 20 minutes
- Issue #2 (Verbose Mode): 1-2 hours
- Testing & Verification: 30 minutes

**Recommended Order**:
1. Issue #3 first (biggest UX impact)
2. Issue #1 second (quick win)
3. Issue #2 last (most time-consuming)

---

**DISCOVERY COMPLETE - Ready for Planning**

All three issues have been analyzed, root causes identified, and implementation approaches defined. Clear task breakdown and acceptance criteria established. Ready to proceed with implementation planning.

**Next Steps**:
1. Create detailed implementation plan (PLAN.md update)
2. Begin with Issue #3 (Auto Mode)
3. Implement Issue #1 (ASCII Header)
4. Implement Issue #2 (Verbose Mode)
5. Test all changes together
6. Commit and deploy fixes
