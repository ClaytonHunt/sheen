# Discovery Findings - Sheen v0.1.0 Architecture Review

**Discovery Date**: January 16, 2026  
**Project Version**: v0.1.0 (Production Ready)  
**Status**: ✅ COMPLETE - Comprehensive analysis ready for next phase planning

---

## Executive Summary

Sheen is a **production-ready** autonomous coding agent with human oversight, implemented as a global Node.js/TypeScript CLI tool. The v0.1.0 release has achieved all MVP exit criteria with 89 passing tests (65 unit tests, 14 integration tests, 10 smoke tests), zero TypeScript errors in strict mode, and cross-platform compatibility (Windows validated).

The project is now at a strategic inflection point: having successfully proven the autonomous agent architecture using OpenCode subprocess integration, it's positioned to migrate to a more performant and reliable **direct AI SDK integration** while maintaining backward compatibility during transition.

---

## Documentation Inventory

### Planning & Strategy Documents
- **`.sheen/plan.md`** (156 lines): Active execution plan with comprehensive AI SDK migration roadmap
- **`.sheen/context.md`** (407 lines): Complete architecture reference, design principles, execution flow
- **`PLAN.md`** (158 lines): Implementation plan with API contracts, module structure, test strategy
- **`PLAN_v0.1.0.md`**: Historical v0.1.0 planning document
- **`PROMPT.md`** (289 lines): Active development prompt for autonomous building
- **`START_HERE.md`** (167 lines): Quick start guide for new developers

### Status & Analysis Documents
- **`PROJECT_STATUS.md`** (364 lines): Complete implementation tracking, test results, metrics
- **`README.md`** (319 lines): Public-facing documentation, usage, architecture
- **`DISCOVERY.md`** (58 lines, current): Previous discovery findings
- **`DIRECT_AI_SDK_ANALYSIS.md`** (535 lines): Comprehensive analysis of AI SDK migration path
- **`TEST_RESULTS.md`**: Test execution results and recommendations
- **`GETTING_STARTED.md`** (3.6KB): Development workflow guide

### Reference Implementations
- **`sheen.sh`** (30KB, 774 lines): Working bash reference from AdventureEngine
  - Autonomous loop implementation (lines 587-722)
  - Phase detection and management (lines 312-402)
  - OpenCode integration patterns (lines 404-498)
  - Error recovery strategies (lines 287-310)
- **`poc-direct-ai-sdk.ts`**: Working proof-of-concept for direct AI SDK usage

### Configuration
- **`.sheenconfig`**: Runtime configuration with iteration limits, timeouts, auto-commit settings
- **`package.json`**: v0.1.0, global CLI binary configuration, 89 tests passing
- **`tsconfig.json`**: Strict TypeScript mode enabled

---

## Current Architecture Deep Dive

### Technology Stack
- **Runtime**: Node.js 18+ with TypeScript 5.0 (strict mode)
- **CLI Framework**: Commander.js v11.0.0
- **Output/UX**: Chalk v4.1.2, Ora v5.4.1, Inquirer v8.2.5
- **Testing**: Jest v30.2.0 with ts-jest v29.4.6
- **LLM Backend**: OpenCode (subprocess integration, migration to AI SDK planned)
- **Distribution**: npm global package with binary entry point

### Component Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    CLI Entry Point                        │
│              src/index.ts + src/cli.ts                   │
│         (Commander.js - argument parsing)                │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│              Project Detection Layer                      │
│                 src/project/                              │
│  • detector.ts (240 lines) - Auto-detect type/framework  │
│  • initializer.ts (170 lines) - Create .sheen/ structure │
│  • analyzer.ts - Analyze project structure               │
│  • loader.ts - Load existing .sheen/ files               │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│                Agent Orchestrator                         │
│              src/core/agent.ts (210 lines)               │
│  Coordinates: OpenCode, Tools, ExecutionLoop, Context    │
└─────────────────────┬────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
┌──────────┐  ┌──────────┐  ┌──────────────┐
│ Planning │  │ Context  │  │ Execution    │
│ System   │  │ Manager  │  │ Loop         │
│ planner  │  │ context  │  │ loop.ts      │
│ .ts      │  │ .ts      │  │ (104 lines)  │
└──────────┘  └──────────┘  └──────┬───────┘
                                    │
                      ┌─────────────┘
                      ▼
┌──────────────────────────────────────────────────────────┐
│           OpenCode Integration Layer                      │
│                src/opencode/                              │
│  • client.ts (247 lines) - Subprocess management         │
│  • adapter.ts (214 lines) - Tool call parsing/execution  │
│  • Format: TOOL_CALL: {...} text parsing                 │
│  • Phase marker detection for autonomous loop            │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│                   Tool System                             │
│              src/tools/registry.ts                        │
│                  (176 lines, 20 tests)                   │
│                                                           │
│  ┌──────────────┬──────────────┬──────────────┐         │
│  │  File Tools  │  Git Tools   │ Shell Tools  │         │
│  │ (336 lines)  │ (133 lines)  │  (57 lines)  │         │
│  │  16 tests    │  10 tests    │   7 tests    │         │
│  │              │              │              │         │
│  │ • read_file  │ • git_status │ • shell_exec │         │
│  │ • write_file │ • git_commit │              │         │
│  │ • list_files │ • git_diff   │              │         │
│  │ • edit_file  │              │              │         │
│  │ • search_    │              │              │         │
│  │   files      │              │              │         │
│  └──────────────┴──────────────┴──────────────┘         │
│                                                           │
│  Total: 9 tools, 33 tool-specific tests                  │
└───────────────────────────────────────────────────────────┘
```

### Execution Loop Architecture

The **ExecutionLoop** (src/core/loop.ts, 104 lines, 12 tests) is the heart of autonomous operation:

**Key Responsibilities**:
- Multi-iteration control with configurable max iterations
- Progress detection (file changes, git commits, test execution)
- Stopping criteria evaluation (max iterations, pause state, completion, errors, no progress)
- Iteration tracking and state management

**Stopping Conditions**:
```typescript
shouldContinue(): boolean {
  if (iteration >= maxIterations) return false;
  if (state.paused) return false;
  if (phase === 'complete') return false;
  if (consecutiveErrors >= 3) return false;
  if (consecutiveNoProgress >= 5) return false;
  return true;
}
```

**Progress Detection**:
- File system changes (new/modified files)
- Git commits (new commits since last check)
- Test execution (test output detection)

### Tool System Design

**ToolRegistry Pattern**:
- Centralized tool registration and validation
- Parameter validation using schemas
- Execution wrapper with error handling
- Tool categorization and documentation
- 20 comprehensive tests covering all scenarios

**Tool Implementation Pattern**:
```typescript
interface Tool {
  name: string;
  description: string;
  parameters: {
    name: string;
    type: 'string' | 'number' | 'boolean';
    description: string;
    required: boolean;
  }[];
  execute: (params: any, context: ProjectContext) => Promise<ToolResult>;
}
```

**Safety Features**:
- Parameter validation before execution
- Error handling and recovery
- Respect for .gitignore patterns
- File size limits
- Output truncation for large results

### OpenCode Integration Details

**Current Implementation** (OpenCodeClient):
- Spawns OpenCode as subprocess
- Passes prompt, context, and available tools
- Captures stdout/stderr streams
- Parses tool calls from text output: `TOOL_CALL: {...}`
- Detects phase completion markers
- Handles errors and timeouts

**Limitations Identified**:
- Subprocess overhead (~30-50% performance impact)
- Text parsing fragility (UIMessage/ModelMessage bugs)
- Limited control over conversation loop
- Difficult error debugging
- Not optimized for autonomous headless operation

---

## Test Coverage & Quality Metrics

### Test Suite Breakdown (89 Total Tests - 100% Passing)

**Unit Tests (65 tests)**:
- ExecutionLoop: 12 tests (shouldContinue logic, progress detection, iteration management)
- File Tools: 16 tests (read, write, list, edit, search operations)
- Tool Registry: 20 tests (registration, validation, execution, error handling)
- Git Tools: 10 tests (status, commit, diff operations)
- Shell Tools: 7 tests (command execution, error handling, output capture)

**Integration Tests (14 tests)**:
- Tool System end-to-end: 8 tests (test-tools.ts)
- OpenCode Integration: 6 tests (test-opencode.ts)

**Smoke Tests (10 scenarios)** via smoke-test.sh:
1. CLI version check
2. CLI help display
3. .sheen/ initialization
4. Project type detection
5. TypeScript build
6. Unit test suite execution
7. Tool system verification
8. OpenCode integration
9. Tool registration (9 tools)
10. Test coverage verification

**Code Quality**:
- TypeScript Strict Mode: ✅ Enabled, 0 errors
- Test Pass Rate: 100% (89/89)
- Build Time: <2 seconds
- Test Execution: ~3 seconds
- Cross-Platform: Windows validated, Linux/macOS compatible

### File Statistics
- **Implementation**: ~3,000+ lines across 20+ TypeScript modules
- **Tests**: ~750+ lines across 5 test suites
- **Documentation**: ~20,000+ words across planning/status docs
- **Total Project Size**: Comprehensive, production-ready

---

## Design Principles & Patterns

### 1. Test-Driven Development (TDD)
All features follow RED-GREEN-REFACTOR cycle:
- Write tests first (RED)
- Implement minimal code (GREEN)
- Commit after passing
- Refactor as needed

**Evidence**: 21 commits following TDD pattern, comprehensive test coverage for all components

### 2. Phase-Based Autonomous Execution
Work is broken into small, manageable phases (15-30 min max):
- Each phase is focused, testable, committable, and resumable
- Clear phase completion markers
- Natural checkpoints for human oversight
- Better progress visibility and error isolation

### 3. Safety-First Design
- Bounded iterations (configurable max, default 50)
- Error limits (3 consecutive errors stops execution)
- No-progress detection (5 consecutive iterations stops)
- Parameter validation on all tool calls
- Respect for .gitignore patterns
- Non-destructive defaults

### 4. Modular & Extensible Architecture
- Clear separation of concerns (CLI, Agent, Loop, Tools, OpenCode)
- Interface-driven design (easy to swap implementations)
- Plugin-ready tool system (registry pattern)
- Configuration layering (global + project-specific)

### 5. Global-First Design
- Install once, use anywhere (`npm install -g sheen`)
- Auto-detect project context from any directory
- Auto-initialize .sheen/ structure
- Works in empty directories (bootstrap new projects)

---

## Functional Requirements Analysis

### Core Capabilities (v0.1.0 - COMPLETE)

**✅ Global CLI Installation**
- Binary entry point: `dist/index.js` with shebang
- npm global package configuration
- Works from any directory
- `sheen --version`, `sheen --help`, `sheen init`, `sheen "prompt"`

**✅ Project Context Detection**
- Auto-detect project type (Node.js, Python, Go, Rust, Ruby, Java, etc.)
- Framework detection (Express, React, Django, Rails, etc.)
- Language detection with version info
- Git repository awareness
- Dependency analysis

**✅ Autonomous Execution Loop**
- Multi-iteration execution with progress tracking
- Phase-based work segmentation
- Tool call execution (9 tools across 3 categories)
- Error handling and recovery
- Progress detection (files, commits, tests)
- Stopping criteria (iterations, errors, no-progress, completion)

**✅ Tool System**
- 9 production-ready tools
- Parameter validation and error handling
- File operations: read, write, list, edit, search
- Git operations: status, commit, diff
- Shell operations: exec
- Registry pattern for extensibility

**✅ .sheen/ State Management**
- Auto-initialization with templates
- plan.md: Generated task plans
- context.md: Project context and architecture
- config.json: Project-specific settings
- history.jsonl: Execution log (template)

**✅ Configuration System**
- Global config: `~/.sheen/config.json`
- Project config: `.sheen/config.json`
- Configuration merging and precedence
- Environment variable support

**✅ OpenCode Integration**
- Subprocess spawning and management
- Tool call parsing and execution
- Phase detection for autonomous loop
- Streaming output support
- Error handling and recovery

### Functional Gaps Identified

**⏳ Live User Input** (Planned but not implemented)
- Non-blocking input queue during execution
- User corrections between phases
- Control commands (pause, resume, stop, status)

**⏳ Task Planner** (Partially implemented)
- plan.md parsing and task management
- Task prioritization and dependencies
- Progress tracking per task
- Task state management (pending, in_progress, complete)

**⏳ Session Resumability** (Partially implemented)
- Save/restore execution state
- Resume from interruption
- History replay

**⏳ Custom Tool Loading** (Not implemented)
- User-defined tools in .sheen/tools/
- Plugin architecture for tool extensions

---

## Strategic Migration Path: OpenCode → Direct AI SDK

### Current State Assessment

**OpenCode Subprocess Model**:
- ✅ Proven: Works in production (v0.1.0)
- ✅ Complete: All tools implemented and tested
- ⚠️ Performance: 30-50% overhead from subprocess
- ⚠️ Fragility: Text parsing for tool calls (`TOOL_CALL: {...}`)
- ⚠️ Bugs: UIMessage/ModelMessage conversion issues
- ⚠️ Control: Limited conversation loop control
- ⚠️ Debugging: Difficult to trace errors

**Direct AI SDK Benefits**:
- ✅ Performance: Eliminate subprocess overhead
- ✅ Reliability: Native tool calling (no text parsing)
- ✅ Control: Full conversation loop ownership
- ✅ Debugging: Direct error handling and tracing
- ✅ Flexibility: Easy provider switching (Anthropic, OpenAI, Google)
- ✅ Autonomous-First: Design for headless operation from ground up

### Migration Roadmap (from .sheen/plan.md)

**Phase 1: Direct AI SDK Integration** (HIGH PRIORITY)
Estimated Effort: 2-3 weeks

**Detailed Task Breakdown**:

1. **Install Dependencies** (2 hours)
   - Add: `ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `zod`
   - Configure API keys
   - Add feature flag: `ai.engine: "opencode" | "direct-ai-sdk"`

2. **Create AIAgent Class** (4-6 hours)
   - Implement `src/core/ai-agent.ts` to replace OpenCodeClient
   - Use `streamText()` and `generateText()` from AI SDK
   - Conversation history management with `CoreMessage[]`
   - Streaming support with `onStepFinish` callbacks
   - Reference: `poc-direct-ai-sdk.ts` (working proof-of-concept)

3. **Port Tools to AI SDK Format** (8-10 hours)
   - Reimplement 9 tools using `tool()` from AI SDK
   - Critical tools: bash, read, write, edit, grep, glob, todowrite/todoread
   - Preserve existing schemas and validation
   - Maintain backward compatibility with tool semantics
   - Reference: `DIRECT_AI_SDK_ANALYSIS.md` for patterns

4. **Implement Safety & Permission System** (4-6 hours)
   - Create PermissionManager class
   - Allow/deny/ask patterns per tool
   - .gitignore respect for file operations
   - Output limits and truncation
   - Destructive action guards (e.g., rm -rf detection)

5. **Update Execution Loop** (4-6 hours)
   - Modify `src/core/loop.ts` to support both engines
   - Use feature flag to switch implementations
   - Maintain backward compatibility during transition
   - Comprehensive error handling for AI SDK errors

6. **Context Window Management** (3-4 hours)
   - Automatic context trimming near token limits
   - Smart message pruning (keep system prompt, recent context)
   - Conversation summarization for long sessions
   - Token counting and usage tracking

7. **Testing & Validation** (6-8 hours)
   - Integration tests for AIAgent class
   - Test all tools with real file operations
   - Performance comparison: OpenCode vs Direct AI SDK
   - Validate token usage optimization
   - Load testing with parallel agent execution

8. **Migration & Cleanup** (2-3 hours)
   - Migrate production usage to direct AI SDK
   - Remove OpenCode dependency from package.json
   - Update documentation
   - Archive OpenCode client code

**Success Metrics**:
- ✅ All 9 core tools working with AI SDK
- ✅ 30%+ performance improvement over OpenCode
- ✅ Zero middleware-related bugs
- ✅ Successful autonomous task completion
- ✅ Token usage within acceptable limits (track and optimize)

**Risk Mitigation**:
- Keep OpenCode integration as fallback during development
- Use feature flags for gradual rollout
- Golden tests to compare OpenCode vs SDK behavior
- Comprehensive error handling and logging
- Incremental migration (one tool at a time)

---

## Architecture Decision Records (ADRs)

### ADR-001: Use Vercel AI SDK for Direct LLM Integration

**Context**: OpenCode subprocess integration has proven the autonomous agent concept but introduces performance overhead and maintenance challenges.

**Decision**: Migrate to Vercel AI SDK for direct LLM provider integration with provider-agnostic abstraction.

**Rationale**:
- Performance: Eliminate 30-50% subprocess overhead
- Reliability: Native tool calling vs. text parsing
- Control: Full conversation loop ownership for autonomous operation
- Flexibility: Easy provider switching (Anthropic, OpenAI, Google, etc.)
- Debugging: Direct error tracing and handling

**Consequences**:
- Need to reimplement tools in AI SDK format (8-10 hours)
- Maintain backward compatibility during transition
- More direct control but also more responsibility for conversation management
- Better positioned for future enhancements (multi-agent, advanced context)

**Status**: Approved, planning complete, ready for implementation

---

### ADR-002: Phase-Based Autonomous Execution

**Context**: Autonomous agents can attempt too much work at once, leading to errors, poor quality, and difficult debugging.

**Decision**: Break all work into small, focused phases (15-30 min max) with clear boundaries.

**Rationale**:
- Better progress visibility and user confidence
- Easier error isolation and debugging
- Natural checkpoints for human oversight
- Meaningful git history with logical commits
- Safer incremental changes

**Consequences**:
- Need clear phase detection and transition logic
- More commits (feature, not bug)
- Better resumability and state management
- Clearer progress reporting to users

**Status**: Implemented in v0.1.0, working well

---

### ADR-003: Test-Driven Development Methodology

**Context**: Building a complex autonomous system requires high code quality and confidence.

**Decision**: Follow strict TDD methodology: write tests first, implement minimal code, commit after passing.

**Rationale**:
- High test coverage from day one (89 tests, 100% passing)
- Immediate feedback on correctness
- Better design through test-first thinking
- Confidence for refactoring and changes
- Documentation through tests

**Consequences**:
- Slower initial development (more than offset by fewer bugs)
- Comprehensive test suite maintenance
- Higher quality, more maintainable code
- Easier onboarding for new contributors

**Status**: Implemented, proven successful in v0.1.0

---

## Constraints & Assumptions

### Technical Constraints
- **Node.js 18+**: Minimum runtime version for ES modules and modern features
- **TypeScript Strict Mode**: Non-negotiable for type safety and reliability
- **Cross-Platform**: Must work on Windows, macOS, Linux
- **Global Installation**: Must be installable via `npm install -g`
- **No Native Dependencies**: Stick to pure Node.js/npm packages for compatibility

### Operational Constraints
- **Bounded Execution**: Maximum iterations to prevent runaway loops
- **Error Limits**: Stop after consecutive errors (3) or no-progress (5)
- **Token Budgets**: Manage context window and token usage for cost control
- **File Safety**: Respect .gitignore, validate paths, limit file sizes
- **Git Awareness**: Detect and respect repository boundaries

### Assumptions
- **OpenCode Available**: Current implementation assumes OpenCode is installed and accessible
- **Git Repository**: Most features assume working within a git repository
- **Project Root Detection**: Relies on common project markers (package.json, requirements.txt, go.mod, etc.)
- **Autonomous Mode Primary**: Designed for headless autonomous operation, interactive features secondary
- **Single Agent**: v0.1.0 assumes single-agent operation (multi-agent future)

---

## Forward Technical Approach

### Immediate Next Steps (Post-Discovery)

1. **Create Implementation Plan**
   - Break down AI SDK migration into detailed tasks
   - Estimate effort for each component
   - Define success criteria and acceptance tests
   - Set up feature flags for gradual rollout

2. **Prototype AIAgent Interface**
   - Define provider-agnostic AIAgent interface
   - Create adapter for existing OpenCode integration
   - Implement basic AI SDK integration
   - Validate conversation loop control

3. **Port One Tool as Proof-of-Concept**
   - Select simple tool (e.g., read_file)
   - Implement using AI SDK `tool()` function
   - Test behavioral parity with OpenCode version
   - Document patterns for remaining tools

4. **Incremental Migration**
   - Port remaining critical tools (bash, write, edit)
   - Add safety and permission layers
   - Implement context window management
   - Performance testing and optimization

5. **Validation & Cutover**
   - Comprehensive integration testing
   - Golden tests for behavioral parity
   - Performance benchmarks (target: 30%+ improvement)
   - Documentation updates
   - Deprecate OpenCode integration

### Mid-Term Enhancements (Post-Migration)

**Multi-Agent Orchestration**:
- Parallel task execution with multiple agents
- Agent coordination and communication
- Shared state management
- Load balancing and resource allocation

**Enhanced Context Management**:
- Semantic code search integration
- Intelligent codebase summarization
- Dependency graph analysis
- Project-wide refactoring support

**Advanced Safety Features**:
- Sandbox execution environment
- Rollback mechanism for failed changes
- Automated testing before commits
- Cost controls and token budgets
- Real-time monitoring and alerting

**Monitoring & Observability**:
- Real-time progress dashboard
- Token usage analytics and cost tracking
- Performance metrics (iteration time, tool usage, success rate)
- Error tracking and alerting
- Session replay for debugging

### Long-Term Vision

**Plugin Ecosystem**:
- Custom tool marketplace
- Community-contributed tools
- Tool versioning and compatibility
- MCP (Model Context Protocol) integration

**Team Collaboration**:
- Shared .sheen/ state via cloud sync
- Team-wide task coordination
- Collaborative autonomous development
- Code review integration

**Platform Integration**:
- GitHub Actions workflows
- CI/CD pipeline automation
- Deployment automation
- Infrastructure as Code support

**Advanced AI Features**:
- LSP integration for code intelligence
- Multi-model support (specialized models per task)
- Reinforcement learning from outcomes
- Self-improvement through feedback loops

---

## Risk Assessment & Mitigation Strategies

### High-Priority Risks

**Risk: Behavioral Drift During AI SDK Migration**
- **Impact**: HIGH - Tool behavior changes could break existing workflows
- **Probability**: MEDIUM - Different providers/implementations may behave differently
- **Mitigation**: 
  - Golden tests comparing OpenCode vs. SDK outputs
  - Gradual rollout with feature flags
  - Comprehensive integration tests
  - User acceptance testing with dogfooding

**Risk: Context Window Explosion**
- **Impact**: HIGH - Long autonomous sessions could exceed token limits or incur high costs
- **Probability**: HIGH - Without management, context grows unbounded
- **Mitigation**:
  - Implement hard token limits
  - Automatic context pruning and summarization
  - Smart message selection (keep system prompt, recent context, key history)
  - Token usage monitoring and alerting
  - Cost controls and budgets

**Risk: Tool Safety Violations**
- **Impact**: CRITICAL - Destructive operations could damage user code/data
- **Probability**: LOW - Current safeguards in place, but migration could introduce gaps
- **Mitigation**:
  - Comprehensive permission system (allow/deny/ask)
  - .gitignore respect and path validation
  - Destructive action detection (rm -rf, etc.)
  - Dry-run mode for testing
  - Extensive safety testing

### Medium-Priority Risks

**Risk: Performance Regression**
- **Impact**: MEDIUM - If AI SDK integration is slower than OpenCode
- **Probability**: LOW - Expected to be 30-50% faster
- **Mitigation**:
  - Performance benchmarks before and after
  - Profiling and optimization
  - Caching and memoization strategies
  - Parallel execution where possible

**Risk: API Rate Limiting**
- **Impact**: MEDIUM - LLM provider rate limits could halt autonomous operation
- **Probability**: MEDIUM - Depends on usage patterns and provider limits
- **Mitigation**:
  - Implement exponential backoff and retry logic
  - Rate limit awareness and throttling
  - Multiple provider fallback
  - User notification and graceful degradation

**Risk: Complex Error Recovery**
- **Impact**: MEDIUM - AI SDK errors may be harder to handle than subprocess errors
- **Probability**: MEDIUM - Different error types from direct API calls
- **Mitigation**:
  - Comprehensive error typing and handling
  - Detailed logging and tracing
  - Fallback strategies for recoverable errors
  - User-friendly error messages

### Low-Priority Risks

**Risk: Breaking Changes in AI SDK**
- **Impact**: LOW-MEDIUM - SDK updates could break integration
- **Probability**: LOW - Vercel AI SDK is stable and well-maintained
- **Mitigation**:
  - Pin dependencies to specific versions
  - Regular dependency updates with testing
  - Monitor SDK changelog and deprecations
  - Maintain adapter pattern for easy provider switching

---

## Open Questions & Decisions Needed

### Technical Questions

1. **Context Management Strategy**
   - Q: What's the optimal context window size for autonomous operation?
   - Q: How should we prioritize messages when pruning (recency, importance, token count)?
   - Q: Should we use sliding window, summarization, or hybrid approach?
   - **Action**: Research best practices, prototype strategies, measure performance

2. **Tool Execution Permissions**
   - Q: Should autonomous mode auto-approve all tools, or use heuristics?
   - Q: How do we balance safety with autonomy?
   - Q: What's the UX for interactive approval in non-autonomous mode?
   - **Action**: Design permission matrix, user testing, iterate

3. **Error Recovery Strategy**
   - Q: When should the agent retry vs. stop vs. ask for help?
   - Q: How do we distinguish recoverable vs. fatal errors?
   - Q: Should the agent learn from errors to avoid repetition?
   - **Action**: Define error taxonomy, implement recovery strategies, test extensively

4. **Performance Optimization**
   - Q: What are the bottlenecks in the current execution loop?
   - Q: Can we parallelize tool execution safely?
   - Q: What's the optimal maxSteps setting for AI SDK?
   - **Action**: Profile current implementation, benchmark optimizations

### Product Questions

1. **User Interaction Model**
   - Q: How should users provide mid-execution feedback in autonomous mode?
   - Q: Should we support "pause and ask" checkpoints?
   - Q: What's the UX for live input queue?
   - **Action**: User research, prototype UX, usability testing

2. **Dogfooding Timeline**
   - Q: When should we switch to using Sheen to build Sheen?
   - Q: What's the minimum feature set for self-hosting development?
   - Q: How do we handle the bootstrap problem?
   - **Action**: Define dogfooding readiness criteria, plan transition

3. **Community Contributions**
   - Q: How do we enable community tool contributions?
   - Q: What's the review/approval process for custom tools?
   - Q: Should we have a tool marketplace or registry?
   - **Action**: Design contribution workflow, documentation, governance

---

## Success Metrics & KPIs

### Technical Success Metrics

**AI SDK Migration (Phase 1)**:
- ✅ All 9 core tools reimplemented and tested
- ✅ 100% test pass rate maintained (89+ tests)
- ✅ 30%+ performance improvement over OpenCode (measure: end-to-end task completion time)
- ✅ Zero middleware-related bugs (no text parsing errors)
- ✅ Token usage within target (baseline + measure, optimize for <20% overhead)

**Quality Metrics**:
- Test Coverage: Maintain 100% pass rate, add tests for new features
- TypeScript Errors: Zero (strict mode)
- Build Time: <2 seconds
- Test Execution: <5 seconds
- Cross-Platform: Windows, macOS, Linux all passing

**Performance Metrics**:
- Task Completion Time: 30-50% faster than v0.1.0
- Tool Execution Overhead: <100ms per tool call
- Context Window Utilization: <80% of max tokens
- Memory Usage: <500MB for typical autonomous session

### Product Success Metrics

**User Adoption**:
- Successful dogfooding (use Sheen to build Sheen)
- Community contributions (custom tools, bug reports, PRs)
- npm downloads and GitHub stars

**User Satisfaction**:
- Task success rate: >80% of autonomous tasks complete successfully
- User intervention rate: <20% of tasks require manual correction
- Error recovery rate: >90% of errors recovered autonomously

**Reliability**:
- Uptime: 99%+ availability (no crashes, graceful error handling)
- Mean Time Between Failures (MTBF): >50 autonomous tasks
- Mean Time To Recovery (MTTR): <1 minute for recoverable errors

---

## Resource Requirements

### Development Team
- **Current**: 1 autonomous agent (OpenCode/Sheen itself)
- **Ideal**: 1-2 human developers for oversight, testing, and refinement

### Time Estimates
- **AI SDK Migration (Phase 1)**: 2-3 weeks full-time
- **Multi-Agent Features (Phase 2)**: 1-2 weeks
- **Enhanced Context Management**: 1 week
- **Advanced Safety Features**: 1 week
- **Total to v0.2.0**: 4-6 weeks

### Infrastructure
- **LLM API Access**: Anthropic Claude 3.5 Sonnet (primary), OpenAI GPT-4 (fallback)
- **Token Budget**: Estimate 1-2M tokens/day for active development
- **Storage**: Minimal (<1GB for project state, logs, history)
- **Compute**: Standard developer laptop sufficient (Node.js runtime)

---

## Stakeholders & Communication

### Internal Stakeholders
- **Development Agent (Sheen)**: Primary builder and user of the system
- **Human Oversight**: Reviews decisions, validates outputs, provides guidance

### External Stakeholders
- **Open Source Community**: Potential contributors, users, testers
- **AI SDK Maintainers (Vercel)**: Dependency on their releases and support
- **LLM Providers (Anthropic, OpenAI)**: API availability and pricing

### Communication Channels
- **Documentation**: README, PLAN, PROJECT_STATUS, discovery docs
- **Git Commits**: Detailed commit messages following conventional commits
- **GitHub Issues/PRs**: For community engagement (when open-sourced)
- **Logs/History**: Detailed execution logs in .sheen/history.jsonl

---

## Appendix: Key File References

### Critical Implementation Files
- `src/core/agent.ts` (210 lines): Main orchestrator
- `src/core/loop.ts` (104 lines): Execution loop with 12 tests
- `src/tools/registry.ts` (176 lines): Tool system with 20 tests
- `src/opencode/client.ts` (247 lines): Current LLM integration
- `src/opencode/adapter.ts` (214 lines): Tool call parsing

### Planning & Documentation
- `.sheen/plan.md` (156 lines): Active plan with AI SDK roadmap
- `.sheen/context.md` (407 lines): Complete architecture reference
- `PLAN.md` (158 lines): Implementation plan with contracts
- `PROJECT_STATUS.md` (364 lines): Status tracking and metrics
- `DIRECT_AI_SDK_ANALYSIS.md` (535 lines): Migration analysis

### Reference Implementations
- `sheen.sh` (774 lines): Bash reference implementation
- `poc-direct-ai-sdk.ts`: Working AI SDK proof-of-concept

### Configuration
- `package.json`: v0.1.0, dependencies, scripts
- `tsconfig.json`: TypeScript strict mode
- `.sheenconfig`: Runtime configuration example

---

## Conclusion & Next Steps

**Summary**: Sheen v0.1.0 is a production-ready autonomous coding agent with a solid foundation: 89 passing tests, strict TypeScript, cross-platform support, and proven autonomous execution. The architecture is modular, extensible, and well-documented.

**Strategic Position**: At a critical juncture to migrate from OpenCode subprocess integration to direct AI SDK integration, unlocking significant performance improvements (30-50%), better reliability, and full autonomous control.

**Recommended Next Actions**:

1. **✅ DISCOVERY COMPLETE** - This document
2. **→ Planning Phase** - Create detailed implementation plan for Phase 1 (AI SDK migration)
3. **→ Prototype** - Build AIAgent interface and port one tool as proof-of-concept
4. **→ Incremental Migration** - Port remaining tools with comprehensive testing
5. **→ Validation** - Performance benchmarks, golden tests, integration testing
6. **→ Dogfooding** - Use Sheen to build Sheen with new AI SDK backend
7. **→ Iterate** - Based on dogfooding feedback, enhance and optimize

**Key Insight**: The project has successfully validated the autonomous agent architecture with OpenCode. The migration to direct AI SDK is a controlled, low-risk evolution that will unlock significant benefits while maintaining all the hard-won patterns and safeguards from v0.1.0.

**Readiness**: All prerequisites met for Phase 1 implementation. Documentation is comprehensive, architecture is sound, tests are passing, and the migration path is clear.

---

**DISCOVERY COMPLETE - Ready for Planning**

**Approved By**: Autonomous Agent (Sheen)  
**Date**: January 16, 2026  
**Next Phase**: Planning → Implementation → Validation → Dogfooding
