# Multi-Agent Autonomous Development Team - Implementation Plan

## Overview

Refactor sheen from linear phases (Discovery → Planning → Implementation → Validation) to a multi-agent autonomous team architecture that works continuously until goals are achieved.

## Architecture Summary

```
Goal Input
    ↓
PM: Auto-detect Features
    ↓
For Each Feature:
    ↓
    TechLead: Create Architecture/Specs
    ↓
    For Each Story/Task:
        ↓
        Dev: Implement (with up to 10 auto-heal attempts)
        ↓
        QA: Test
        ↓
        [If fail: auto-heal loop up to 10x]
        ↓
        [If 10 failures: exit with error]
    ↓
    UAT: Validate Feature
    ↓
    [If fail: PM creates new fix task, loop back]
    ↓
    [If pass: mark feature complete]
    ↓
[Repeat until all features complete]
    ↓
Final Integration UAT
    ↓
    [If fail: PM creates fix tasks, loop back]
    ↓
    [If pass: GOAL ACHIEVED ✅]
```

## File Structure Changes

### Current Structure
```
.sheen/
├── plan.md          # Single flat task list
├── context.md       # Project context
├── config.json      # Configuration
└── history.jsonl    # Execution history
```

### New Structure
```
.sheen/
├── goal.md                    # Original goal(s) from user
├── backlog.md                 # Current features/stories/tasks hierarchy
├── feature-status.md          # Feature completion tracking
├── config.json                # Configuration (existing)
├── history.jsonl              # Execution history (existing)
├── context.md                 # Project context (existing)
│
├── pm/
│   ├── inbox.md              # Questions/requests for PM
│   ├── decisions.md          # PM decisions/clarifications
│   └── feature-breakdown.md  # How PM decomposed goal into features
│
├── techlead/
│   ├── inbox.md              # Architecture questions from Dev
│   ├── specs.md              # Technical specifications
│   └── architecture.md       # Architecture decisions/ADRs
│
├── dev/
│   ├── inbox.md              # Tasks and questions for Dev
│   ├── progress.md           # Current work in progress
│   └── completed.md          # Work completed this session
│
├── qa/
│   ├── inbox.md              # Test requests
│   ├── results.md            # Test results (pass/fail)
│   └── test-history.md       # Historical test runs
│
└── uat/
    ├── inbox.md              # Feature validation requests
    ├── results.md            # UAT results (pass/fail with reasons)
    └── integration-uat.md    # Final integration UAT results
```

## Data Models

### Goal Structure (goal.md)
```markdown
# Goal

[User's original goal description]

## Success Criteria

- [Criterion 1]
- [Criterion 2]
- ...

## Constraints

- [Constraint 1]
- [Constraint 2]
- ...
```

### Backlog Structure (backlog.md)
```markdown
# Backlog

## Features

### Feature: [Feature Name]
**ID**: feature_[timestamp]_[random]
**Status**: pending | in_progress | completed | failed
**Priority**: high | medium | low
**UAT Status**: pending | passed | failed

#### Stories

##### Story: [Story Name]
**ID**: story_[timestamp]_[random]
**Status**: pending | in_progress | completed | failed
**Feature**: feature_[id]

###### Tasks
- [ ] **task_[id]**: [Task description] (status: pending)
- [x] **task_[id]**: [Task description] (status: completed)
- [!] **task_[id]**: [Task description] (status: failed, attempts: 3/10)

#### Acceptance Criteria
- [Criterion 1]
- [Criterion 2]
```

### Feature Status (feature-status.md)
```markdown
# Feature Status

## Completed Features
- ✅ Feature: User Authentication (UAT: Passed)
- ✅ Feature: Dashboard UI (UAT: Passed)

## In Progress Features
- 🔨 Feature: Data Export (UAT: Pending)
  - Stories: 2/3 complete
  - Current: Implementing CSV export

## Pending Features
- ⏳ Feature: Email Notifications
- ⏳ Feature: Admin Panel
```

### Agent Inbox Format

Each agent has an `inbox.md` with timestamped messages:

```markdown
# [Agent Role] Inbox

## Message [timestamp]
**From**: [source agent or system]
**Type**: question | request | notification
**Priority**: high | medium | low

[Message content]

**Status**: pending | addressed

---

## Message [timestamp]
...
```

## Agent Roles & Prompts

### 1. PM Agent

**System Prompt:**
```
You are an experienced Product Manager working autonomously.

ROLE:
- Break down high-level goals into Features
- Decompose Features into Stories and Tasks
- Prioritize work based on dependencies and value
- Define acceptance criteria for each feature
- Create fix tasks when UAT fails
- Answer clarification questions from the team

AUTONOMOUS MODE:
- Make decisions based on best practices and common patterns
- Do NOT ask the user for input
- Use reasonable assumptions when details are unclear
- Document your decisions in pm/decisions.md

WORKFLOW:
1. Read goal.md to understand the objective
2. Identify distinct Features (major capabilities)
3. For each Feature, create Stories (user-facing functionality)
4. For each Story, create Tasks (technical work items)
5. Define clear acceptance criteria
6. Prioritize based on dependencies

OUTPUT FORMAT:
Always update backlog.md with structured hierarchy.
Document reasoning in pm/decisions.md.
```

**Input Files:**
- `goal.md` - Original user goal
- `pm/inbox.md` - Questions from other agents
- `uat/results.md` - Failed UAT results (to create fix tasks)
- `backlog.md` - Current backlog state

**Output Files:**
- `backlog.md` - Updated with features/stories/tasks
- `pm/decisions.md` - Decision rationale
- `pm/feature-breakdown.md` - How goal was decomposed

**When to run:**
- Initial goal breakdown
- When UAT fails (create fix tasks)
- When Dev/QA ask questions in pm/inbox.md

### 2. Tech Lead Agent

**System Prompt:**
```
You are a Senior Technical Lead/Architect working autonomously.

ROLE:
- Review features for architectural implications
- Create technical specifications
- Make design decisions (patterns, libraries, approaches)
- Answer technical questions from developers
- Ensure code quality and consistency

AUTONOMOUS MODE:
- Choose proven, standard approaches
- Document architecture decisions (ADRs)
- Make pragmatic technical choices
- Do NOT ask the user for input

WORKFLOW:
1. Read backlog.md to see upcoming feature
2. Analyze technical requirements
3. Create architecture specification
4. Document key technical decisions
5. Respond to developer questions

OUTPUT FORMAT:
Write specs to techlead/specs.md.
Document ADRs in techlead/architecture.md.
```

**Input Files:**
- `backlog.md` - Features to review
- `techlead/inbox.md` - Technical questions
- Codebase (via file tools)
- `context.md` - Project context

**Output Files:**
- `techlead/specs.md` - Technical specifications
- `techlead/architecture.md` - Architecture decisions
- `techlead/inbox.md` - Mark questions as addressed

**When to run:**
- Before each new feature starts
- When Dev asks technical questions (on-demand)

### 3. Developer Agent

**System Prompt:**
```
You are a Senior Software Developer working autonomously.

ROLE:
- Implement features from backlog
- Write clean, tested code
- Follow technical specifications
- Make commits for logical units of work
- Fix issues identified by QA

AUTONOMOUS MODE:
- Choose standard implementations
- Write unit tests alongside code
- Make reasonable technical choices
- Ask TechLead if architectural questions arise
- Do NOT ask the user for input

WORKFLOW:
1. Pick next task from backlog.md
2. Read techlead/specs.md for guidance
3. Implement the task
4. Write/update tests
5. Commit with clear message
6. Update dev/progress.md
7. If QA finds issues, read qa/results.md and fix

AUTO-HEAL:
When QA reports failures:
- Read qa/results.md carefully
- Understand the issue
- Implement fix
- Re-test locally if possible
- You have up to 10 attempts per task

OUTPUT FORMAT:
Write code to appropriate files.
Commit with descriptive messages.
Update dev/progress.md with status.
```

**Input Files:**
- `backlog.md` - Tasks to implement
- `techlead/specs.md` - Technical guidance
- `qa/results.md` - Test failures to fix
- Codebase (via file tools)

**Output Files:**
- Code files (implementation)
- Test files
- `dev/progress.md` - Current status
- Git commits

**When to run:**
- When there are pending tasks in backlog
- After QA failure (auto-heal)

### 4. QA Agent

**System Prompt:**
```
You are a Quality Assurance Engineer working autonomously.

ROLE:
- Test each implementation against acceptance criteria
- Run automated test suites
- Report failures with clear, actionable details
- Verify fixes after auto-heal attempts
- Ensure quality standards are met

AUTONOMOUS MODE:
- Run tests automatically after each Dev implementation
- Provide detailed failure reports
- Do NOT ask the user for input

WORKFLOW:
1. Read backlog.md to see acceptance criteria
2. Run relevant test suites
3. Verify implementation meets criteria
4. Report results in qa/results.md with:
   - Pass/Fail status
   - Specific failures (line numbers, error messages)
   - Steps to reproduce
   - Expected vs actual behavior

OUTPUT FORMAT:
Write detailed results to qa/results.md.
Use clear, actionable language for Dev to fix.
```

**Input Files:**
- `backlog.md` - Acceptance criteria
- `dev/progress.md` - What was implemented
- Codebase & test files (via file tools)

**Output Files:**
- `qa/results.md` - Test results
- `qa/test-history.md` - Historical results

**When to run:**
- After each Dev implementation
- After each auto-heal fix attempt

### 5. UAT Agent

**System Prompt:**
```
You are a User Acceptance Testing specialist working autonomously.

ROLE:
- Validate features against original goal
- Test from end-user perspective
- Verify business requirements are met
- Approve or reject features with clear reasoning
- Perform final integration UAT for entire goal

AUTONOMOUS MODE:
- Test features thoroughly
- Make objective pass/fail decisions
- Provide specific feedback when rejecting
- Do NOT ask the user for input

WORKFLOW - Feature UAT:
1. Read goal.md to understand original intent
2. Read backlog.md for feature acceptance criteria
3. Test feature end-to-end from user perspective
4. Verify against business requirements
5. Pass or fail with detailed reasoning

WORKFLOW - Integration UAT:
1. Test all features together
2. Verify no regressions
3. Test edge cases and integration points
4. Validate entire goal is achieved
5. Final pass/fail decision

OUTPUT FORMAT:
Write results to uat/results.md with:
- Pass/Fail decision
- What was tested
- Issues found (if failed)
- Specific requirements not met
```

**Input Files:**
- `goal.md` - Original objective
- `backlog.md` - Feature acceptance criteria
- `feature-status.md` - Features to validate
- Codebase (via file tools)

**Output Files:**
- `uat/results.md` - Feature UAT results
- `uat/integration-uat.md` - Final integration results

**When to run:**
- After all stories/tasks in a feature are complete
- Final run after all features are complete (integration UAT)

## Core Loop Implementation

### Main Loop Structure

```typescript
interface ExecutionState {
  goal: Goal;
  backlog: Backlog;
  currentFeature?: Feature;
  currentTask?: Task;
  failureCount: number; // Per-task failure count
  overallStatus: 'in_progress' | 'completed' | 'failed';
}

async function autonomousLoop(goal: string): Promise<void> {
  // 1. Initialize
  const state = await initializeState(goal);
  await pmAgent.breakdownGoal(state);
  
  // 2. Process each feature
  while (state.backlog.hasPendingFeatures()) {
    const feature = state.backlog.getNextFeature();
    state.currentFeature = feature;
    
    console.log(`🎯 Starting Feature: ${feature.name}`);
    
    // 2a. TechLead reviews feature
    await techLeadAgent.reviewFeature(feature);
    
    // 2b. Process each story/task in feature
    const taskResult = await processFeatureTasks(state, feature);
    
    if (!taskResult.success) {
      console.error(`❌ Failed to complete feature ${feature.name}`);
      state.overallStatus = 'failed';
      return;
    }
    
    // 2c. Run Feature UAT
    console.log(`🎭 UAT: Validating feature ${feature.name}`);
    const uatResult = await uatAgent.validateFeature(feature);
    
    if (uatResult.pass) {
      console.log(`✅ Feature ${feature.name} passed UAT`);
      feature.markComplete();
    } else {
      console.log(`❌ Feature UAT failed: ${uatResult.reason}`);
      console.log(`📋 PM: Creating fix tasks...`);
      await pmAgent.createFixTasks(feature, uatResult.issues);
      // Loop continues with new fix tasks
    }
  }
  
  // 3. Final Integration UAT
  console.log(`🎭 Running Final Integration UAT...`);
  const integrationResult = await uatAgent.validateIntegration(state.goal);
  
  if (integrationResult.pass) {
    console.log(`🎉 GOAL ACHIEVED! All features pass integration UAT.`);
    state.overallStatus = 'completed';
  } else {
    console.log(`❌ Integration UAT failed: ${integrationResult.reason}`);
    console.log(`📋 PM: Creating integration fix tasks...`);
    await pmAgent.createFixTasks(null, integrationResult.issues);
    
    // Recursively process new tasks
    // (In practice, might want max iterations here too)
    await autonomousLoop(goal); // Continue with fix tasks
  }
}

async function processFeatureTasks(
  state: ExecutionState, 
  feature: Feature
): Promise<{ success: boolean }> {
  
  while (feature.hasIncompleteTasks()) {
    const task = feature.getNextTask();
    state.currentTask = task;
    state.failureCount = 0; // Reset for new task
    
    console.log(`📋 Task: ${task.description}`);
    
    // Check if TechLead input needed on-demand
    if (await devAgent.needsTechLeadInput(task)) {
      await techLeadAgent.respondToQuestion(task);
    }
    
    // Auto-heal loop (up to 10 attempts)
    let success = false;
    
    while (state.failureCount < 10 && !success) {
      state.failureCount++;
      
      console.log(`🔨 Dev: Implementing (attempt ${state.failureCount}/10)`);
      await devAgent.implement(task);
      
      console.log(`🧪 QA: Testing...`);
      const qaResult = await qaAgent.test(task);
      
      if (qaResult.pass) {
        success = true;
        task.markComplete();
        console.log(`✅ Task complete`);
      } else {
        console.log(`❌ QA failed (attempt ${state.failureCount}/10): ${qaResult.reason}`);
        if (state.failureCount < 10) {
          console.log(`🔄 Auto-healing...`);
          // Dev will read qa/results.md and fix on next iteration
        }
      }
    }
    
    if (!success) {
      console.error(`🛑 Task failed after 10 attempts`);
      console.error(`📝 Human intervention required. See qa/results.md`);
      return { success: false };
    }
  }
  
  return { success: true };
}
```

### Key Functions

```typescript
// PM Agent
class PMAgent {
  async breakdownGoal(state: ExecutionState): Promise<void>;
  async createFixTasks(feature: Feature | null, issues: string[]): Promise<void>;
  async answerQuestion(question: string): Promise<string>;
}

// TechLead Agent
class TechLeadAgent {
  async reviewFeature(feature: Feature): Promise<void>;
  async respondToQuestion(task: Task): Promise<void>;
}

// Developer Agent
class DeveloperAgent {
  async implement(task: Task): Promise<void>;
  async needsTechLeadInput(task: Task): Promise<boolean>;
}

// QA Agent
class QAAgent {
  async test(task: Task): Promise<QAResult>;
}

// UAT Agent
class UATAgent {
  async validateFeature(feature: Feature): Promise<UATResult>;
  async validateIntegration(goal: Goal): Promise<UATResult>;
}
```

## Migration Strategy

### Phase 1: Core Infrastructure
1. Create new directory structure (`.sheen/pm/`, `.sheen/techlead/`, etc.)
2. Implement agent role classes (PMAgent, TechLeadAgent, etc.)
3. Create agent prompt templates
4. Implement markdown file readers/writers for agent communication

### Phase 2: Agent Implementation
1. Implement PMAgent with goal decomposition
2. Implement TechLeadAgent with spec generation
3. Implement DeveloperAgent with auto-heal
4. Implement QAAgent with testing
5. Implement UATAgent with validation

### Phase 3: Loop Logic
1. Implement main autonomous loop
2. Implement task processing with auto-heal
3. Implement feature UAT triggers
4. Implement final integration UAT

### Phase 4: Backward Compatibility
1. Add migration for old `.sheen/plan.md` format
2. Keep existing config.json format (extend as needed)
3. Ensure `sheen` command works with both old and new formats

### Phase 5: Testing & Refinement
1. Test with simple goal (e.g., "Add a hello world endpoint")
2. Test with complex goal (e.g., "Implement user authentication")
3. Test auto-heal recovery
4. Test UAT failure and fix cycle
5. Test final integration UAT

## Configuration Changes

### New config.json fields

```json
{
  "version": "0.3.0",
  "multiAgent": {
    "enabled": true,
    "maxTaskAttempts": 10,
    "roles": {
      "pm": { "enabled": true },
      "techlead": { "enabled": true },
      "dev": { "enabled": true },
      "qa": { "enabled": true },
      "uat": { "enabled": true }
    }
  },
  "uatTriggers": {
    "afterEachFeature": true,
    "afterAllFeatures": true
  },
  "autoHeal": {
    "enabled": true,
    "maxAttempts": 10
  }
}
```

## Success Metrics

### Exit Conditions

**Success:**
- All features identified by PM
- All features pass feature UAT
- Final integration UAT passes
- No pending tasks in backlog

**Failure:**
- Any task exceeds 10 auto-heal attempts
- Integration UAT fails after max iterations (TBD: maybe 3?)

### Observability

During execution, show:
- Current feature being worked on
- Current task being implemented
- Auto-heal attempt count
- QA test results
- UAT validation results
- Overall progress (X/Y features complete)

## Example Execution

```
$ sheen "Implement user authentication with email/password"

   _____ __
  / ___// /_  ___  ___  ____
  \__ \/ __ \/ _ \/ _ \/ __ \
 ___/ / / / /  __/  __/ / / /
/____/_/ /_/\___/\___/_/ /_/

Autonomous coding agent

[INFO] 🚀 Sheen starting in multi-agent mode...
[INFO] 📂 Detected: nodejs project
[INFO] 📋 PM: Breaking down goal into features...
[INFO] ✅ Identified 3 features:
        - Feature 1: User Registration
        - Feature 2: User Login
        - Feature 3: Password Reset

[INFO] 🎯 Starting Feature: User Registration
[INFO] 🏗️  TechLead: Reviewing feature architecture...
[INFO] ✅ TechLead: Created specification in techlead/specs.md

[INFO] 📋 Task: Create user model and schema
[INFO] 🔨 Dev: Implementing (attempt 1/10)
[INFO] 🧪 QA: Testing...
[ERROR] ❌ QA failed (attempt 1/10): Email validation regex incorrect
[INFO] 🔄 Auto-healing...
[INFO] 🔨 Dev: Implementing (attempt 2/10)
[INFO] 🧪 QA: Testing...
[SUCCESS] ✅ Task complete

[INFO] 📋 Task: Create registration endpoint
[INFO] 🔨 Dev: Implementing (attempt 1/10)
[INFO] 🧪 QA: Testing...
[SUCCESS] ✅ Task complete

[INFO] 📋 Task: Add registration integration tests
[INFO] 🔨 Dev: Implementing (attempt 1/10)
[INFO] 🧪 QA: Testing...
[SUCCESS] ✅ Task complete

[INFO] 🎭 UAT: Validating feature User Registration
[SUCCESS] ✅ Feature User Registration passed UAT

[INFO] 🎯 Starting Feature: User Login
...

[INFO] 🎭 Running Final Integration UAT...
[SUCCESS] ✅ Integration UAT passed!
[SUCCESS] 🎉 GOAL ACHIEVED!

Summary:
- Features completed: 3/3
- Tasks completed: 12/12
- Auto-heal recoveries: 1
- Total time: 45 minutes
```

## Open Questions

1. **How to handle TechLead on-demand requests?**
   - Dev writes to `techlead/inbox.md`, then what?
   - Does loop pause and invoke TechLead immediately?
   - Or does Dev continue and TechLead responds async?
   
   **Proposed:** Dev blocks and waits for TechLead response (sequential)

2. **Should PM run between features?**
   - To re-prioritize remaining features?
   - Or only run once at start and when UAT fails?
   
   **Proposed:** Only at start and UAT failures

3. **Integration UAT failure limit?**
   - Currently can loop forever if integration UAT keeps failing
   - Should have max iterations? (e.g., 3 integration UAT attempts)
   
   **Proposed:** Add max 3 integration UAT cycles

4. **Parallel task execution in future?**
   - Some tasks might be independent
   - Could run multiple Dev agents in parallel
   
   **Proposed:** V2 feature, keep sequential for now

5. **Agent context window management?**
   - Agents need to read many markdown files
   - Could exceed context limits on large projects
   
   **Proposed:** Implement summary/pruning strategy per agent

## Implementation Checklist

- [ ] Design complete (this document)
- [ ] Create file structure for agent communication
- [ ] Implement Goal → Feature → Story → Task data model
- [ ] Implement PMAgent with goal breakdown
- [ ] Implement TechLeadAgent with specs
- [ ] Implement DeveloperAgent with auto-heal
- [ ] Implement QAAgent with testing
- [ ] Implement UATAgent with validation
- [ ] Implement main autonomous loop
- [ ] Implement auto-heal retry logic
- [ ] Implement feature UAT triggers
- [ ] Implement final integration UAT
- [ ] Add configuration options
- [ ] Migrate from old plan.md format
- [ ] Add comprehensive logging
- [ ] Test with simple goal
- [ ] Test with complex goal
- [ ] Test auto-heal scenarios
- [ ] Test UAT failure cycles
- [ ] Documentation update
- [ ] Release as v0.3.0

## Timeline Estimate

- Core Infrastructure: 2-3 hours
- Agent Implementation: 4-6 hours
- Loop Logic: 3-4 hours
- Testing & Refinement: 3-5 hours
- **Total: 12-18 hours of development**

## Notes

- This is a significant architectural change
- Consider creating a feature branch for development
- May want to keep old phase-based system as fallback
- Should be opt-in via config initially
- Need extensive testing before making default
