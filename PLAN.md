# Sheen v0.2.0 Implementation Plan - Phase 5 Integration

**Created**: January 16, 2026  
**Status**: READY FOR IMPLEMENTATION  
**Based On**: DISCOVERY.md comprehensive analysis  
**Current Progress**: 60% Complete (12/20 major tasks)  
**Remaining Effort**: ~39 hours (1 week full-time)

---

## Executive Summary

This plan details Phase 5 implementation for Sheen's AI SDK integration. Phases 1-4 are complete (60% done), with all foundational components implemented. Phase 5 focuses on integration, testing, and validation to enable the first end-to-end AI SDK execution.

**What's Already Done** (Phases 1-4):
- ✅ AIAgent interface and abstractions
- ✅ DirectAIAgent with native AI SDK support
- ✅ All 11 tools ported to AI SDK format
- ✅ Permission system and safety features
- ✅ ConversationManager for context management
- ✅ ProviderFactory for multi-provider support

**What's Next** (Phase 5):
- Update ExecutionLoop to support both engines
- Update Agent orchestrator to use AIAgent interface
- Create golden tests for parity validation
- Build E2E integration tests

---

## Architecture & Design Decisions

### Current Architecture (v0.1.0 - Production)

```
User Command → CLI → Agent → ExecutionLoop → OpenCodeClient (subprocess)
                                                     ↓
                                             (text parsing)
                                             (tool execution)
```

**Issues**:
- 30-50% performance overhead from subprocess spawning
- Text parsing fragility (`TOOL_CALL: {...}` parsing)
- Limited control over conversation loop
- Difficult debugging (subprocess boundaries)

### Target Architecture (v0.2.0 - In Progress)

```
User Command → CLI → Agent → ExecutionLoop → AIAgent (interface)
                                                     ↓
                                     ┌───────────────┴────────────────┐
                                     ↓                                ↓
                             OpenCodeAdapter ✅                DirectAIAgent ✅
                             (backward compat)               (AI SDK native)
                                                                     ↓
                                                             ProviderFactory ✅
                                                                     ↓
                                                     ┌───────────────┴────────┐
                                                     ↓               ↓        ↓
                                               Anthropic ✅      OpenAI ✅  Google ✅
```

**Benefits**:
- Native tool calling (no text parsing)
- 30-50% performance improvement
- Full conversation control
- Direct error handling
- Provider flexibility

### ADR-001: Dual-Engine Support via Feature Flag

**Decision**: Support both OpenCode and AI SDK engines during transition

**Rationale**:
- Gradual rollout reduces risk
- Fallback to OpenCode if issues arise
- Users can choose engine
- Validate AI SDK before full cutover

**Implementation**:
```typescript
interface AIConfig {
  engine: 'opencode' | 'direct-ai-sdk';
  provider?: 'anthropic' | 'openai' | 'google';
  model?: string;
  // ... other config
}
```

**Status**: Configuration schema complete, integration pending

---

## API Contracts

### AIAgent Interface (Implemented ✅)

```typescript
/**
 * Provider-agnostic AI agent interface
 * Location: src/ai/agent-interface.ts
 */
interface AIAgent {
  /**
   * Execute prompt and return complete result
   */
  execute(prompt: string, context: AgentContext): Promise<AgentResult>;
  
  /**
   * Stream execution with real-time updates
   */
  stream(prompt: string, context: AgentContext): AsyncIterable<AgentEvent>;
  
  /**
   * Register available tools
   */
  registerTools(tools: ToolDefinition[]): void;
  
  /**
   * Get conversation history
   */
  getConversation(): ConversationMessage[];
  
  /**
   * Reset conversation state
   */
  resetConversation(): void;
}

interface AgentContext {
  projectContext: ProjectContext;
  executionState: ExecutionState;
  configuration: AgentConfig;
  conversationHistory?: ConversationMessage[];
}

interface AgentResult {
  success: boolean;
  response: string;
  toolCalls: ToolCall[];
  metadata: {
    tokensUsed: number;
    executionTimeMs: number;
    iterationsUsed: number;
  };
}
```

### Tool Definition Contract (AI SDK Format - Implemented ✅)

```typescript
/**
 * AI SDK native tool definition
 * Location: src/tools/ai-sdk/*.ts
 */
import { tool } from 'ai';
import { z } from 'zod';

const bashTool = tool({
  description: 'Execute shell commands with timeout and output capture',
  parameters: z.object({
    command: z.string().describe('Shell command to execute'),
    workdir: z.string().optional().describe('Working directory'),
    timeout: z.number().optional().describe('Timeout in milliseconds'),
  }),
  execute: async ({ command, workdir, timeout }, context: ToolContext) => {
    // Permission check
    const allowed = await context.permissionManager.checkPermission('bash', { command });
    if (!allowed) return { success: false, error: 'Permission denied' };
    
    // Tool implementation
    // ...
  }
});
```

### Configuration Contract (Implemented ✅)

```typescript
interface AgentConfig {
  // Engine selection
  engine: 'opencode' | 'direct-ai-sdk';
  
  // Provider settings (for direct-ai-sdk)
  provider?: 'anthropic' | 'openai' | 'google';
  model?: string;
  apiKey?: string; // Falls back to environment variables
  
  // Execution settings
  maxIterations: number;
  maxSteps?: number; // AI SDK multi-step reasoning limit
  timeout?: number;
  
  // Context management
  maxTokens?: number;
  contextWindowSize?: number;
  enablePruning?: boolean;
  
  // Safety settings
  autoApprove?: boolean;
  toolPermissions?: Record<string, 'allow' | 'deny' | 'ask'>;
}
```

---

## Module Structure

### Implemented Modules (Phases 1-4 Complete)

#### src/ai/ ✅
- `agent-interface.ts` (126 lines) - AIAgent interface definition
- `opencode-adapter.ts` - OpenCode compatibility wrapper
- `direct-ai-agent.ts` - Native AI SDK implementation
- `conversation-manager.ts` - Message history & context management
- `provider-factory.ts` - Multi-provider support
- `index.ts` - Module exports

#### src/tools/ai-sdk/ ✅
- `bash-tool.ts` - Shell command execution
- `read-tool.ts` - File reading with line numbers
- `write-tool.ts` - File creation/overwrite
- `edit-tool.ts` - Exact string replacement
- `grep-tool.ts` - Content search with regex
- `glob-tool.ts` - File pattern matching
- `git-tools.ts` - Git operations (status, diff, commit)
- `todo-tools.ts` - Task management (read/write)
- `types.ts` - Tool context definitions
- `index.ts` - Complete registry (11 tools)

#### src/permissions/ ✅
- `permission-manager.ts` - Permission checking with allow/deny/ask patterns
- `gitignore-filter.ts` - Respect .gitignore patterns
- `index.ts` - Module exports

### Modules Needing Updates (Phase 5)

#### src/core/agent.ts ⏳
**Current**: 210 lines, uses OpenCodeClient directly  
**Needed**: Update to use AIAgent interface  
**Changes**:
- Replace `OpenCodeClient` with `AIAgent` interface
- Add factory logic for engine selection
- Pass configuration for provider setup
- Update tool registration

#### src/core/loop.ts ⏳
**Current**: 104 lines, assumes OpenCodeClient  
**Needed**: Support dual-engine operation  
**Changes**:
- Use AIAgent interface instead of OpenCodeClient
- Add feature flag checking (`config.ai.engine`)
- Instantiate appropriate agent implementation
- Maintain backward compatibility

---

## Test Strategy

### Current Test Coverage
- **89 Total Tests** (100% Passing)
- Unit Tests: 65 tests
- Integration Tests: 14 tests
- Smoke Tests: 10 scenarios

### Target Test Coverage (Phase 5)
- **120+ Total Tests**
- Add 30+ new tests for AI SDK integration
- Maintain 100% pass rate throughout

### Test Categories for Phase 5

#### 1. Integration Tests (10 tests)
```typescript
// tests/ai/integration.test.ts
describe('AIAgent Integration', () => {
  it('should use OpenCodeAdapter when engine=opencode', async () => {
    const config = { ai: { engine: 'opencode' } };
    const agent = createAgent(config);
    expect(agent).toBeInstanceOf(OpenCodeAdapter);
  });
  
  it('should use DirectAIAgent when engine=direct-ai-sdk', async () => {
    const config = { ai: { engine: 'direct-ai-sdk', provider: 'anthropic' } };
    const agent = createAgent(config);
    expect(agent).toBeInstanceOf(DirectAIAgent);
  });
  
  // ... more integration tests
});
```

#### 2. Golden Tests - Parity Validation (10 tests)
```typescript
// tests/parity/tool-parity.test.ts
describe('OpenCode vs AI SDK Parity', () => {
  const testScenarios = [
    { name: 'Read package.json', task: 'read package.json and show version' },
    { name: 'Write test file', task: 'create test.txt with "hello world"' },
    { name: 'Execute git status', task: 'show git repository status' },
    { name: 'Search for TODOs', task: 'search for TODO comments in src/' },
  ];
  
  for (const scenario of testScenarios) {
    it(`produces equivalent results for: ${scenario.name}`, async () => {
      const opencodeResult = await runWithEngine('opencode', scenario.task);
      const sdkResult = await runWithEngine('direct-ai-sdk', scenario.task);
      
      // Compare tool calls, outputs, and behavior
      expect(sdkResult.toolCalls).toMatchBehavior(opencodeResult.toolCalls);
      expect(sdkResult.success).toBe(opencodeResult.success);
    });
  }
});
```

#### 3. End-to-End Tests (8 tests)
```typescript
// tests/e2e/autonomous-execution.test.ts
describe('E2E Autonomous Execution with AI SDK', () => {
  it('should complete simple file operation task', async () => {
    const task = 'Create test.txt with "Hello Sheen"';
    const result = await runAutonomousTask(task, { engine: 'direct-ai-sdk' });
    
    expect(result.success).toBe(true);
    expect(fs.existsSync('test.txt')).toBe(true);
    expect(fs.readFileSync('test.txt', 'utf-8')).toBe('Hello Sheen');
  });
  
  it('should complete multi-step task with reasoning', async () => {
    const task = 'Create package.json, add express dependency, create index.js';
    const result = await runAutonomousTask(task, { engine: 'direct-ai-sdk' });
    
    expect(result.success).toBe(true);
    expect(result.metadata.iterationsUsed).toBeGreaterThan(1);
    expect(fs.existsSync('package.json')).toBe(true);
    expect(fs.existsSync('index.js')).toBe(true);
  });
  
  it('should handle errors and recover gracefully', async () => {
    const task = 'Read non-existent-file.txt and create it if missing';
    const result = await runAutonomousTask(task, { engine: 'direct-ai-sdk' });
    
    expect(result.success).toBe(true);
    expect(fs.existsSync('non-existent-file.txt')).toBe(true);
  });
  
  it('should respect iteration limits', async () => {
    const task = 'Infinite loop task'; // Intentionally problematic
    const result = await runAutonomousTask(task, { 
      engine: 'direct-ai-sdk',
      maxIterations: 5 
    });
    
    expect(result.metadata.iterationsUsed).toBeLessThanOrEqual(5);
  });
  
  // ... more E2E tests
});
```

#### 4. Performance Tests (5 tests)
```typescript
// tests/performance/benchmark.test.ts
describe('Performance Benchmarks', () => {
  it('AI SDK should be 30%+ faster than OpenCode', async () => {
    const task = 'Read package.json and list dependencies';
    
    const opencodeStart = Date.now();
    await runWithEngine('opencode', task);
    const opencodeTime = Date.now() - opencodeStart;
    
    const sdkStart = Date.now();
    await runWithEngine('direct-ai-sdk', task);
    const sdkTime = Date.now() - sdkStart;
    
    const improvement = (opencodeTime - sdkTime) / opencodeTime;
    expect(improvement).toBeGreaterThan(0.3); // 30%+ improvement
  });
  
  it('should complete task with acceptable token usage', async () => {
    const task = 'Simple file operation';
    const result = await runWithEngine('direct-ai-sdk', task);
    
    expect(result.metadata.tokensUsed).toBeLessThan(5000);
  });
  
  // ... more performance tests
});
```

---

## Implementation Steps

### Phase 5: Integration & Testing (CURRENT PRIORITY)

#### Task 5.1: Update ExecutionLoop (4 hours)

**Goal**: Support both OpenCode and AI SDK engines via feature flag

**Location**: `src/core/loop.ts:104`

**Changes Needed**:
1. Import AIAgent interface
2. Update constructor to accept AIAgent instead of OpenCodeClient
3. Add factory logic for engine selection
4. Maintain backward compatibility

**Implementation**:
```typescript
// src/core/loop.ts

import { AIAgent } from '../ai/agent-interface';
import { OpenCodeAdapter } from '../ai/opencode-adapter';
import { DirectAIAgent } from '../ai/direct-ai-agent';
import { ProviderFactory } from '../ai/provider-factory';

export class ExecutionLoop {
  private agent: AIAgent;
  private config: AgentConfig;
  
  constructor(config: AgentConfig) {
    this.config = config;
    this.agent = this.createAgent(config);
  }
  
  private createAgent(config: AgentConfig): AIAgent {
    if (config.ai.engine === 'direct-ai-sdk') {
      // Create AI SDK agent
      const provider = ProviderFactory.create(
        config.ai.provider || 'anthropic',
        config.ai.model || 'claude-3-5-sonnet-20241022',
        config.ai.apiKey
      );
      
      return new DirectAIAgent(provider, config);
    } else {
      // Use OpenCode adapter (backward compatible)
      const openCodeClient = new OpenCodeClient(config);
      return new OpenCodeAdapter(openCodeClient);
    }
  }
  
  async run(prompt: string): Promise<ExecutionResult> {
    // Use agent.execute() instead of direct OpenCodeClient calls
    const context = this.buildContext();
    const result = await this.agent.execute(prompt, context);
    
    // Process result and continue execution loop
    // ...
  }
}
```

**Tests**:
```typescript
// tests/core/loop-integration.test.ts
describe('ExecutionLoop with AI SDK', () => {
  it('should use OpenCodeAdapter when engine=opencode', () => {
    const config = { ai: { engine: 'opencode' } };
    const loop = new ExecutionLoop(config);
    expect(loop['agent']).toBeInstanceOf(OpenCodeAdapter);
  });
  
  it('should use DirectAIAgent when engine=direct-ai-sdk', () => {
    const config = { 
      ai: { engine: 'direct-ai-sdk', provider: 'anthropic' } 
    };
    const loop = new ExecutionLoop(config);
    expect(loop['agent']).toBeInstanceOf(DirectAIAgent);
  });
  
  it('should maintain existing stopping conditions', async () => {
    // Test iteration limits, pause state, completion detection
  });
});
```

**Acceptance Criteria**:
- [ ] Loop works with both engines
- [ ] Feature flag controls selection
- [ ] Existing tests still pass (12+ tests)
- [ ] New integration tests pass (5+ tests)

---

#### Task 5.2: Update Agent Orchestrator (3 hours)

**Goal**: Integrate AIAgent interface into Agent class

**Location**: `src/core/agent.ts:210`

**Changes Needed**:
1. Remove direct OpenCodeClient usage
2. Use AIAgent interface
3. Update tool registration for AI SDK
4. Pass configuration correctly

**Implementation**:
```typescript
// src/core/agent.ts

import { AIAgent } from '../ai/agent-interface';
import { getAISDKTools } from '../tools/ai-sdk';

export class Agent {
  private aiAgent: AIAgent;
  private loop: ExecutionLoop;
  
  constructor(config: AgentConfig) {
    this.loop = new ExecutionLoop(config); // Loop creates AIAgent internally
    this.registerTools(config);
  }
  
  private registerTools(config: AgentConfig): void {
    if (config.ai.engine === 'direct-ai-sdk') {
      // Register AI SDK tools
      const tools = getAISDKTools();
      this.loop['agent'].registerTools(tools);
    } else {
      // Register OpenCode tools (existing behavior)
      const tools = this.getOpenCodeTools();
      this.loop['agent'].registerTools(tools);
    }
  }
  
  async execute(prompt: string): Promise<AgentResult> {
    return this.loop.run(prompt);
  }
}
```

**Tests**:
Update existing Agent tests to verify AIAgent integration

**Acceptance Criteria**:
- [ ] Agent uses AIAgent interface
- [ ] Tool registration works for both engines
- [ ] Existing Agent tests pass (no regressions)

---

#### Task 5.3: Golden Tests for Parity (6 hours)

**Goal**: Verify OpenCode and AI SDK produce equivalent results

**Location**: Create `tests/parity/tool-parity.test.ts`

**Test Scenarios**:
1. Read file operation
2. Write file operation
3. Edit file operation
4. Git status check
5. Git commit creation
6. Shell command execution
7. Grep search operation
8. Glob pattern matching
9. Todo read/write
10. Multi-step autonomous task

**Implementation**:
```typescript
// tests/parity/tool-parity.test.ts

describe('OpenCode vs AI SDK Parity Tests', () => {
  beforeEach(() => {
    // Setup test environment
    createTestDirectory();
  });
  
  afterEach(() => {
    // Cleanup
    cleanupTestDirectory();
  });
  
  describe('File Operations', () => {
    it('read_file produces equivalent results', async () => {
      const task = 'Read package.json and show the version';
      
      const opencodeResult = await runWithEngine('opencode', task);
      const sdkResult = await runWithEngine('direct-ai-sdk', task);
      
      expect(sdkResult.toolCalls).toHaveLength(opencodeResult.toolCalls.length);
      expect(sdkResult.toolCalls[0].tool).toBe('read');
      expect(sdkResult.success).toBe(true);
    });
    
    it('write_file produces equivalent results', async () => {
      const task = 'Create test.txt with content "Hello World"';
      
      await runWithEngine('opencode', task);
      const opencodeContent = fs.readFileSync('test-opencode.txt', 'utf-8');
      
      await runWithEngine('direct-ai-sdk', task);
      const sdkContent = fs.readFileSync('test-sdk.txt', 'utf-8');
      
      expect(sdkContent).toBe(opencodeContent);
    });
  });
  
  describe('Git Operations', () => {
    it('git_status produces equivalent results', async () => {
      // Compare git status outputs
    });
    
    it('git_diff produces equivalent results', async () => {
      // Compare git diff outputs
    });
  });
  
  describe('Multi-Step Tasks', () => {
    it('completes complex task with similar tool usage', async () => {
      const task = 'Create src/utils/helper.ts with a sum function, then read it back';
      
      const opencodeResult = await runWithEngine('opencode', task);
      const sdkResult = await runWithEngine('direct-ai-sdk', task);
      
      // Both should use write then read
      expect(sdkResult.toolCalls.map(t => t.tool)).toEqual(
        opencodeResult.toolCalls.map(t => t.tool)
      );
      
      expect(sdkResult.success).toBe(true);
      expect(opencodeResult.success).toBe(true);
    });
  });
});
```

**Documentation**:
Create `docs/PARITY_VALIDATION.md` documenting:
- Test methodology
- Results comparison
- Known differences
- Behavioral equivalence criteria

**Acceptance Criteria**:
- [ ] All 10+ scenarios tested
- [ ] Results documented
- [ ] Differences (if any) explained
- [ ] Tests pass with acceptable parity

---

#### Task 5.4: End-to-End Integration Tests (6 hours)

**Goal**: Comprehensive real-world testing of AI SDK

**Location**: Create `tests/e2e/autonomous-execution.test.ts`

**Test Categories**:

**1. Basic Autonomous Operation**:
```typescript
describe('Basic Autonomous Tasks', () => {
  it('should complete simple file task', async () => {
    const result = await runAutonomousTask(
      'Create hello.txt with "Hello Sheen"',
      { engine: 'direct-ai-sdk' }
    );
    
    expect(result.success).toBe(true);
    expect(fs.readFileSync('hello.txt', 'utf-8')).toBe('Hello Sheen');
  });
  
  it('should complete multi-file task', async () => {
    const result = await runAutonomousTask(
      'Create index.ts and types.ts with basic TypeScript setup',
      { engine: 'direct-ai-sdk' }
    );
    
    expect(result.success).toBe(true);
    expect(fs.existsSync('index.ts')).toBe(true);
    expect(fs.existsSync('types.ts')).toBe(true);
  });
});
```

**2. Error Recovery**:
```typescript
describe('Error Recovery', () => {
  it('should handle file not found error', async () => {
    const result = await runAutonomousTask(
      'Read missing.txt and create it if not found',
      { engine: 'direct-ai-sdk' }
    );
    
    expect(result.success).toBe(true);
    expect(fs.existsSync('missing.txt')).toBe(true);
  });
  
  it('should recover from invalid command', async () => {
    const result = await runAutonomousTask(
      'Run invalid-command, if it fails create error.log',
      { engine: 'direct-ai-sdk' }
    );
    
    expect(result.success).toBe(true);
    expect(fs.existsSync('error.log')).toBe(true);
  });
});
```

**3. Multi-Step Reasoning**:
```typescript
describe('Multi-Step Reasoning', () => {
  it('should complete complex task with planning', async () => {
    const result = await runAutonomousTask(
      'Create a new npm project with express server on port 3000',
      { engine: 'direct-ai-sdk' }
    );
    
    expect(result.success).toBe(true);
    expect(result.metadata.iterationsUsed).toBeGreaterThan(2);
    expect(fs.existsSync('package.json')).toBe(true);
    expect(fs.existsSync('server.js')).toBe(true);
  });
});
```

**4. Iteration Limits & Stopping Conditions**:
```typescript
describe('Stopping Conditions', () => {
  it('should respect maxIterations limit', async () => {
    const result = await runAutonomousTask(
      'Keep creating files named file1.txt, file2.txt, etc.',
      { engine: 'direct-ai-sdk', maxIterations: 5 }
    );
    
    expect(result.metadata.iterationsUsed).toBeLessThanOrEqual(5);
  });
  
  it('should stop when task is complete', async () => {
    const result = await runAutonomousTask(
      'Create done.txt with "DONE"',
      { engine: 'direct-ai-sdk' }
    );
    
    expect(result.success).toBe(true);
    expect(result.metadata.iterationsUsed).toBeLessThan(3);
  });
});
```

**Acceptance Criteria**:
- [ ] All E2E tests pass (8+ scenarios)
- [ ] Real file operations work correctly
- [ ] Error recovery validated
- [ ] Multi-step reasoning works
- [ ] Stopping conditions respected

---

## Success Metrics & Exit Criteria

### Technical Success Metrics

#### Test Coverage
- ✅ Maintain 100% pass rate (currently 89/89 tests)
- ⏳ Reach 120+ total tests (31+ new tests needed)
- ⏳ No regressions in existing functionality

#### Performance
- ⏳ 30%+ faster task completion vs OpenCode
- ⏳ Tool execution overhead <100ms
- ⏳ Context window usage <80% of limit
- ⏳ Memory usage <500MB per session

#### Quality
- ✅ Zero TypeScript errors (strict mode maintained)
- ⏳ Zero middleware bugs (eliminate text parsing)
- ✅ All 11 tools implemented in AI SDK format
- ⏳ Golden tests pass (OpenCode vs SDK parity)

### Feature Completeness

**Phase 5 Checklist**:
- [ ] ExecutionLoop supports both engines
- [ ] Agent orchestrator uses AIAgent interface
- [ ] Feature flag controls engine selection
- [ ] Golden tests validate parity (10+ scenarios)
- [ ] E2E tests validate autonomous operation (8+ scenarios)
- [ ] Performance benchmarks run successfully
- [ ] All 120+ tests passing

### Exit Criteria for Phase 5

**All of the following must be true**:
1. ⏳ ExecutionLoop dual-engine support working
2. ⏳ Agent orchestrator AIAgent integration complete
3. ⏳ 31+ new tests added and passing (120+ total)
4. ⏳ Golden tests show behavioral parity
5. ⏳ E2E tests validate autonomous execution
6. ⏳ No regressions in existing tests
7. ⏳ Performance improvement measured (even if not 30% yet)
8. ⏳ Documentation updated for new features

**Current Status**: 0 of 8 criteria met (Phase 5 not started)

---

## Risk Assessment & Mitigation

### High-Priority Risks

#### Risk 1: Integration Complexity
**Impact**: HIGH | **Probability**: MEDIUM  
**Description**: ExecutionLoop and Agent updates may introduce subtle bugs

**Mitigation**:
- Comprehensive testing before and after changes
- Feature flag for gradual rollout
- Keep OpenCode as fallback
- Run existing test suite after each change

**Monitoring**: Track test pass rate, run smoke tests frequently

---

#### Risk 2: Behavioral Drift
**Impact**: HIGH | **Probability**: MEDIUM  
**Description**: AI SDK may produce different results than OpenCode

**Mitigation**:
- Golden tests comparing outputs
- Side-by-side validation
- Document acceptable differences
- Test with real-world scenarios

**Monitoring**: Golden test pass rate, user feedback

---

#### Risk 3: Performance Regression
**Impact**: MEDIUM | **Probability**: LOW  
**Description**: Integration overhead might negate AI SDK benefits

**Mitigation**:
- Performance benchmarks before and after
- Profile hot paths
- Optimize critical sections
- Cache where appropriate

**Monitoring**: Benchmark test results, execution time tracking

---

### Medium-Priority Risks

#### Risk 4: Context Window Management
**Impact**: MEDIUM | **Probability**: MEDIUM  
**Description**: Long sessions may exceed token limits

**Mitigation**:
- Token counting and limits enforced
- Context pruning implemented
- Conversation summarization
- Clear error messages for token limits

**Monitoring**: Token usage tracking per session

---

#### Risk 5: Test Environment Consistency
**Impact**: MEDIUM | **Probability**: LOW  
**Description**: E2E tests may have flaky results due to LLM variability

**Mitigation**:
- Use deterministic test scenarios
- Mock LLM responses where appropriate
- Focus on behavior not exact outputs
- Retry flaky tests with increased tolerance

**Monitoring**: Test flakiness rate, rerun statistics

---

## Resource Requirements

### Development Effort

**Phase 5 Tasks**:
- Task 5.1 (ExecutionLoop): 4 hours
- Task 5.2 (Agent): 3 hours
- Task 5.3 (Golden Tests): 6 hours
- Task 5.4 (E2E Tests): 6 hours
- **Total**: 19 hours

**Remaining Phases**:
- Phase 6 (Optimization): 11 hours
- Phase 7 (Documentation): 9 hours
- **Grand Total**: 39 hours (~1 week full-time)

### Infrastructure

**LLM API Access**:
- Primary: Anthropic Claude 3.5 Sonnet
- Fallback: OpenAI GPT-4
- Testing budget: $50-100

**Compute**:
- Standard developer laptop
- Node.js 18+
- 8GB+ RAM recommended
- SSD for faster file operations

---

## Configuration Examples

### OpenCode Engine (Default, Backward Compatible)

```json
{
  "ai": {
    "engine": "opencode",
    "maxIterations": 50
  }
}
```

### AI SDK Engine (New, Ready to Test)

```json
{
  "ai": {
    "engine": "direct-ai-sdk",
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "apiKey": "env:ANTHROPIC_API_KEY",
    "maxIterations": 50,
    "maxSteps": 10,
    "maxTokens": 200000,
    "contextWindowSize": 180000,
    "enablePruning": true
  },
  "permissions": {
    "autoApprove": false,
    "tools": {
      "bash": "allow",
      "read": "allow",
      "write": "ask",
      "edit": "ask",
      "git_commit": "ask"
    }
  }
}
```

### Environment Variables

```bash
# .env or shell environment
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...

# Sheen configuration
SHEEN_ENGINE=direct-ai-sdk
SHEEN_PROVIDER=anthropic
SHEEN_AUTO_APPROVE=false
```

---

## Rollback Plan

If critical issues are found during Phase 5 integration:

1. **Immediate**: Switch default engine back to OpenCode via feature flag
2. **Short-term**: Investigate and fix issue in AI SDK implementation
3. **Medium-term**: Deploy fix and gradually re-enable AI SDK
4. **Long-term**: Maintain both engines until AI SDK proven stable

**Rollback Command**:
```bash
sheen config set ai.engine opencode
```

All existing functionality will continue to work with OpenCode engine.

---

## Key Reference Files

### Implementation Files (v0.2.0)

**Already Implemented (Phases 1-4)**:
- `src/ai/agent-interface.ts:126` - AIAgent interface
- `src/ai/opencode-adapter.ts` - OpenCode compatibility
- `src/ai/direct-ai-agent.ts` - AI SDK implementation
- `src/ai/conversation-manager.ts` - Context management
- `src/ai/provider-factory.ts` - Multi-provider support
- `src/tools/ai-sdk/index.ts` - Tool registry (11 tools)
- `src/permissions/permission-manager.ts` - Safety system
- `src/permissions/gitignore-filter.ts` - .gitignore respect

**Needing Updates (Phase 5)**:
- `src/core/agent.ts:210` - Update to use AIAgent interface
- `src/core/loop.ts:104` - Add dual-engine support

**New Files (Phase 5)**:
- `tests/parity/tool-parity.test.ts` - Golden tests
- `tests/e2e/autonomous-execution.test.ts` - E2E tests
- `tests/performance/benchmark.test.ts` - Performance tests
- `tests/core/loop-integration.test.ts` - Integration tests

### Documentation Files

**Planning & Strategy**:
- `DISCOVERY.md:785` - Comprehensive analysis
- `PLAN.md` - This document
- `PROJECT_STATUS.md:492` - Progress tracking
- `.sheen/context.md:407` - Architecture reference
- `.sheen/plan.md` - Active execution roadmap

**Technical Analysis**:
- `DIRECT_AI_SDK_ANALYSIS.md:535` - AI SDK research
- `TEST_RESULTS.md` - Testing outcomes

**Reference**:
- `README.md:319` - Public documentation
- `START_HERE.md` - Developer quick start
- `poc-direct-ai-sdk.ts` - Working proof-of-concept

---

## Next Steps & Recommendations

### Immediate Actions (This Week)

**Day 1-2: Integration**
1. Complete Task 5.1 (ExecutionLoop update)
2. Complete Task 5.2 (Agent orchestrator update)
3. Run existing tests to verify no regressions
4. Test basic operation with both engines

**Day 3-4: Testing**
5. Complete Task 5.3 (Golden tests)
6. Complete Task 5.4 (E2E tests)
7. Document any behavioral differences
8. Run smoke tests on Windows

**Day 5: Validation**
9. Run performance benchmarks
10. Review test results
11. Update PROJECT_STATUS.md
12. Create summary report

### Validation Strategy

**Dogfooding Plan**:
1. Use Sheen (AI SDK engine) to implement a small feature
2. Monitor performance, token usage, errors
3. Compare experience with OpenCode engine
4. Document findings and improvements
5. Iterate based on real-world usage

### Short-Term Goals (Next Week)

**Week 2 Focus**:
- Complete Phase 6 (Performance optimization)
- Complete Phase 7 (Documentation)
- Prepare for v0.2.0 release
- Conduct final validation

---

## Conclusion

### Current State Assessment

**Strengths**:
- ✅ 60% complete on AI SDK migration (12/20 tasks)
- ✅ All foundational components implemented
- ✅ Clear path forward with detailed plan
- ✅ Comprehensive test strategy defined
- ✅ Rollback strategy available

**Gaps**:
- ⏳ Integration layer incomplete (ExecutionLoop, Agent)
- ⏳ No testing of AI SDK implementation yet
- ⏳ Performance not measured
- ⏳ Documentation needs updates

**Risk Level**: LOW-MEDIUM
- Clear implementation path
- Rollback strategy available (OpenCode fallback)
- Incremental approach reduces risk
- Comprehensive testing planned

### Strategic Position

Sheen is well-positioned to complete Phase 5:

1. **Foundation Solid**: All core components implemented (Phases 1-4)
2. **Path Clear**: Remaining work well-defined and scoped
3. **Resources Available**: Dependencies installed, APIs defined
4. **Risk Managed**: Feature flags, testing strategy, rollback plan
5. **Time Reasonable**: 19 hours estimated for Phase 5

### Recommendation

**Proceed with Phase 5 Implementation**

The project is ready to complete the integration work. Focus on:
1. Integration tasks first (ExecutionLoop, Agent)
2. Testing second (golden tests, E2E tests)
3. Validation third (performance, behavior)
4. Documentation updates throughout

**Estimated Time to Phase 5 Completion**: 1 week (19 hours)

**Confidence Level**: HIGH - Well-planned, partially implemented, clear path forward

---

## PLAN COMPLETE - Ready for Implementation

**Status**: ✅ Comprehensive plan complete, ready to begin Phase 5

### Phase 5 Summary

**What We'll Build**:
1. Dual-engine support in ExecutionLoop
2. AIAgent integration in Agent orchestrator
3. Golden tests for parity validation (10+ scenarios)
4. E2E tests for autonomous operation (8+ scenarios)

**What We'll Validate**:
- Both engines work correctly
- Behavioral parity between engines
- Autonomous execution functions properly
- No regressions in existing features

**What We'll Deliver**:
- First end-to-end AI SDK execution
- 120+ tests passing (31+ new tests)
- Performance baseline established
- Clear path to Phase 6 (optimization)

### Key Success Factors

- Maintain 100% test pass rate throughout
- Use feature flags for gradual rollout
- Golden tests ensure behavioral parity
- E2E tests validate real-world usage
- Document all findings and differences

**Ready to begin implementation**: All prerequisites met, architecture validated, approach proven.

---

**Approved By**: Autonomous Agent (Sheen/OpenCode)  
**Date**: January 16, 2026  
**Version**: Phase 5 Implementation Plan  
**Status**: ✅ PLAN COMPLETE - Ready for Implementation
