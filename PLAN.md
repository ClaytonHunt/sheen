# Implementation Plan: Sheen v0.1.1 Bug Fixes

**Date**: January 16, 2026  
**Phase**: Planning → Implementation  
**Version**: 0.1.0 → 0.1.1 (patch release)  
**Goal**: Fix three user-reported issues to improve UX

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture & Design Decisions](#architecture--design-decisions)
3. [Module Structure](#module-structure)
4. [API Contracts](#api-contracts)
5. [Implementation Steps](#implementation-steps)
6. [Test Strategy](#test-strategy)
7. [Deployment Plan](#deployment-plan)

---

## Overview

### Issues to Fix

| Issue | Priority | Effort | Impact |
|-------|----------|--------|--------|
| #3: Auto mode when no prompt | HIGH | 30 min | High UX improvement |
| #1: ASCII header for version | HIGH | 20 min | Branding/polish |
| #2: Verbose mode not working | MEDIUM | 1-2 hrs | Developer experience |

### Success Metrics

- ✅ `sheen --version` displays ASCII art banner
- ✅ `sheen` with no args enters auto mode if plan exists
- ✅ `sheen --verbose` shows debug logs throughout execution
- ✅ All existing tests still pass (65 tests)
- ✅ Build succeeds with zero TypeScript errors

---

## Architecture & Design Decisions

### Decision 1: Auto Mode Behavior

**Problem**: What should happen when user runs `sheen` with no arguments?

**Options Considered**:
1. Show error message (current behavior)
2. Always enter auto mode, fail if no plan
3. Smart detection: auto mode if plan exists, otherwise show help

**Decision**: Option 3 - Smart Detection ✅

**Reasoning**:
- Best UX: "just works" when you have a plan
- Graceful degradation: helpful message when no plan
- Backward compatible: doesn't break existing workflows
- Aligns with "autonomous agent" vision

**Implementation**:
```typescript
if (!prompt && !options.auto) {
  const planExists = await checkPlanExists();
  if (planExists) {
    logger.info('📝 No prompt provided, entering auto mode');
    options.auto = true;
  } else {
    showHelpMessage();
    return;
  }
}
```

---

### Decision 2: ASCII Art Approach

**Problem**: How to display ASCII art for version command?

**Options Considered**:
1. Use `figlet` package (dynamic generation)
2. Pre-baked ASCII string constant
3. Load from external file

**Decision**: Option 2 - Pre-baked Constant ✅

**Reasoning**:
- No external dependencies (lighter package)
- Faster startup time (no generation overhead)
- Guaranteed formatting (no font issues)
- Simple to maintain

**ASCII Art Design**:
```
   _____ __                  
  / ___// /_  ___  ___  ____ 
  \__ \/ __ \/ _ \/ _ \/ __ \
 ___/ / / / /  __/  __/ / / /
/____/_/ /_/\___/\___/_/ /_/ 
```

---

### Decision 3: Verbose Logging Strategy

**Problem**: Where to add debug logs without cluttering the code?

**Strategy**: Strategic Debug Points ✅

**Guidelines**:
1. **Entry points**: CLI argument parsing, command start
2. **Configuration**: Config file loading, merging
3. **Detection**: Project type detection decisions
4. **External calls**: OpenCode execution, git commands, file I/O
5. **State changes**: Task status updates, phase transitions
6. **Error paths**: Failures and recovery attempts

**Anti-patterns to Avoid**:
- ❌ Debug log inside tight loops
- ❌ Logging every variable assignment
- ❌ Redundant logs (info + debug saying same thing)
- ❌ Sensitive data (API keys, tokens)

**Example Debug Logs**:
```typescript
// Good: Decision point
logger.debug(`Checking for package.json at ${pkgPath}`);
if (await exists(pkgPath)) {
  logger.debug('Found package.json, detected nodejs project');
}

// Good: External call
logger.debug(`Spawning OpenCode with prompt: ${prompt.substring(0, 50)}...`);

// Bad: Too granular
logger.debug('Creating variable x');
logger.debug(`x = ${x}`);
```

---

### Decision 4: Logger Implementation

**Current State Analysis**:

The Logger class (src/utils/logger.ts) is well-implemented:
- ✅ Has `shouldLog()` method with level filtering
- ✅ Supports debug, info, warn, error levels
- ✅ Takes logLevel in constructor
- ✅ Hierarchical levels work correctly

**Problem**: Logger is working correctly, but no debug logs exist in codebase!

**Solution**: Add debug logging statements throughout, don't modify Logger.

---

## Module Structure

### New Files

#### 1. `src/io/banner.ts` (NEW)

**Purpose**: ASCII art banner for version display

**Exports**:
```typescript
export const BANNER: string;
export function showVersion(version: string): void;
```

**Dependencies**: chalk

**Size**: ~30 lines

---

### Modified Files

#### 1. `src/cli.ts` (MODIFIED)

**Changes**:
1. Import banner functions
2. Override version command with custom handler
3. Add auto mode detection logic
4. Add debug logs for CLI parsing

**Lines Changed**: ~20 lines added/modified

---

#### 2. `src/config/global.ts` (MODIFIED)

**Changes**:
1. Add debug logs for config loading
2. Add debug logs for config merging

**Lines Changed**: ~5 lines added

---

#### 3. `src/project/detector.ts` (MODIFIED)

**Changes**:
1. Add debug logs for detection decisions
2. Add debug logs for file checks

**Lines Changed**: ~8 lines added

---

#### 4. `src/core/agent.ts` (MODIFIED)

**Changes**:
1. Add debug logs for agent initialization
2. Add debug logs for tool registration

**Lines Changed**: ~4 lines added

---

#### 5. `src/opencode/client.ts` (MODIFIED)

**Changes**:
1. Add debug logs for OpenCode spawning
2. Add debug logs for output parsing

**Lines Changed**: ~6 lines added

---

#### 6. `src/tools/index.ts` (MODIFIED)

**Changes**:
1. Add debug logs for tool execution

**Lines Changed**: ~3 lines added

---

## API Contracts

### Banner Module API

```typescript
// src/io/banner.ts

/**
 * ASCII art banner for Sheen
 */
export const BANNER: string;

/**
 * Display version information with banner
 * @param version - Version string (e.g., "0.1.0")
 */
export function showVersion(version: string): void;

/**
 * Display just the banner without version
 */
export function showBanner(): void;
```

**Usage**:
```typescript
import { showVersion, BANNER } from './io/banner';

// Display version
showVersion('0.1.0');

// Or access banner directly
console.log(BANNER);
```

---

### CLI Auto Mode Helper

```typescript
// Internal helper in src/cli.ts

/**
 * Check if .sheen/plan.md exists
 * @param cwd - Current working directory
 * @returns true if plan exists
 */
async function checkPlanExists(cwd: string): Promise<boolean>;

/**
 * Show helpful message when no plan exists
 */
function showHelpMessage(logger: Logger): void;
```

---

## Implementation Steps

### Phase 1: Issue #3 - Auto Mode (30 minutes)

#### Step 3.1: Add Plan Existence Check (5 min)

**File**: `src/cli.ts`

**Code**:
```typescript
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Check if .sheen/plan.md exists
 */
async function checkPlanExists(cwd: string): Promise<boolean> {
  const planPath = path.join(cwd, '.sheen', 'plan.md');
  try {
    await fs.access(planPath);
    return true;
  } catch {
    return false;
  }
}
```

**Test**: Unit test for this helper function

---

#### Step 3.2: Modify CLI Action Handler (15 min)

**File**: `src/cli.ts`

**Location**: Main action handler (line ~25)

**Implementation**: Add smart auto mode detection

**Test**: Integration test with/without plan.md

---

#### Step 3.3: Expose Planner in Agent (5 min)

**File**: `src/core/agent.ts`

**Add Method**:
```typescript
/**
 * Get the task planner (for loading existing plans)
 */
public getPlanner(): TaskPlanner {
  return this.planner;
}
```

---

#### Step 3.4: Implement Plan Loading (5 min)

**File**: `src/core/planner.ts`

**Enhancement**: Implement the `parsePlanMarkdown()` method (currently returns empty array)

**Test**: Unit test with sample plan.md

---

### Phase 2: Issue #1 - ASCII Header (20 minutes)

#### Step 1.1: Create Banner Module (10 min)

**File**: `src/io/banner.ts` (NEW)

**Implementation**: Create banner with chalk colors

**Test**: Visual verification test

---

#### Step 1.2: Override Version Command (10 min)

**File**: `src/cli.ts`

**Implementation**: Override Commander version handler

**Test**: Run `sheen --version` and verify output

---

### Phase 3: Issue #2 - Verbose Mode (1-2 hours)

#### Step 2.1-2.6: Add Debug Logs

**Files**: 
- `src/cli.ts` (15 min)
- `src/config/global.ts` (10 min)
- `src/project/detector.ts` (15 min)
- `src/core/agent.ts` (10 min)
- `src/opencode/client.ts` (15 min)
- `src/tools/index.ts` (10 min)

**Total**: 1-1.5 hours

---

#### Step 2.7: Verify Logger Propagation (15 min)

**Action**: Ensure log level is propagated correctly

---

## Test Strategy

### Unit Tests

#### Test 1: Banner Module
**File**: `tests/io/banner.test.ts` (NEW)

Test ASCII art display and formatting

---

#### Test 2: Auto Mode Detection
**File**: `tests/cli/auto-mode.test.ts` (NEW)

Test plan detection and auto mode entry

---

#### Test 3: Plan Markdown Parsing
**File**: `tests/core/planner.test.ts` (MODIFY)

Test plan.md parsing logic

---

#### Test 4: Logger Level Filtering
**File**: `tests/utils/logger.test.ts` (NEW)

Test debug log visibility at different levels

---

### Integration Tests

#### Test 5-7: End-to-End Tests

Test version display, auto mode, and verbose mode in real scenarios

---

### Manual Testing Checklist

**Test Suite**: Post-implementation verification

- [ ] **Version Command**
  - [ ] Run `sheen --version` - see ASCII banner
  - [ ] Run `sheen -V` - same output
  - [ ] Verify formatting looks good in terminal

- [ ] **Auto Mode**
  - [ ] In project with plan.md: `sheen` → auto mode starts
  - [ ] In empty directory: `sheen` → help message shown
  - [ ] With explicit prompt: `sheen "task"` → normal execution

- [ ] **Verbose Mode**
  - [ ] Run `sheen --verbose "test"` → see [DEBUG] logs
  - [ ] Run `sheen "test"` → only [INFO] logs

- [ ] **Regression Testing**
  - [ ] Run full test suite: `npm test` → 65+ tests pass
  - [ ] Build: `npm run build` → zero TypeScript errors

---

## Deployment Plan

### Pre-Deployment Checklist

- [ ] All unit tests passing (65+ tests)
- [ ] All new tests passing (7+ new tests)
- [ ] Manual testing complete
- [ ] Build succeeds with no errors
- [ ] Documentation updated

---

### Version Bump

**Change**: 0.1.0 → 0.1.1 (patch version)

**Files to Update**:
1. `package.json` - version field
2. `src/cli.ts` - version string
3. `README.md` - version references
4. `PROJECT_STATUS.md` - version header

---

### Build & Publish

```bash
# 1. Update version
npm version patch

# 2. Build
npm run build

# 3. Test
node dist/index.js --version

# 4. Link for testing
npm link
sheen --version

# 5. Publish (when ready)
npm publish
```

---

## Success Criteria

### Acceptance Criteria

**Issue #1: ASCII Header** ✅
- [ ] `sheen --version` displays ASCII art
- [ ] Works in compiled npm package

**Issue #2: Verbose Mode** ✅
- [ ] `sheen --verbose` shows DEBUG logs
- [ ] Debug logs present in all major components
- [ ] Regular mode shows only INFO+ logs

**Issue #3: Auto Mode** ✅
- [ ] `sheen` with no args detects plan.md
- [ ] Enters auto mode automatically if plan exists
- [ ] Shows helpful message if no plan exists

**Quality Gates** ✅
- [ ] All existing tests pass (65 tests)
- [ ] Zero TypeScript errors
- [ ] Build succeeds

---

## Implementation Timeline

### Estimated Effort

| Phase | Task | Time | Cumulative |
|-------|------|------|------------|
| 1 | Issue #3: Auto Mode | 30 min | 30 min |
| 2 | Issue #1: ASCII Header | 20 min | 50 min |
| 3 | Issue #2: Verbose Logging | 1-2 hrs | 2-3 hrs |
| 4 | Testing & Verification | 30 min | 2.5-3.5 hrs |

**Total Time**: 2.5-3.5 hours

---

**PLAN COMPLETE - Ready for Implementation**

All three issues have detailed implementation plans with:
- ✅ Architecture and design decisions documented
- ✅ API contracts defined
- ✅ Module structure outlined
- ✅ Step-by-step implementation guide
- ✅ Comprehensive test strategy
- ✅ Deployment plan

**Estimated Total Time**: 2.5-3.5 hours of focused work

**Next Steps**:
1. Begin with Issue #3 (Auto Mode) - highest impact
2. Implement Issue #1 (ASCII Header) - quick win
3. Complete Issue #2 (Verbose Mode) - most thorough
4. Run comprehensive tests
5. Build and deploy v0.1.1

Ready to proceed with implementation! 🚀
