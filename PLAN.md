# Implementation Plan

## Objective

Implement the next development phase of **Sheen**, based on the discovery findings. This plan focuses on stabilizing and extending the current architecture while preparing for a controlled migration from the OpenCode subprocess model to a provider-agnostic AI SDK integration.

---

## Architecture & Design Decisions

### Overall Architecture

Sheen will continue to follow a layered, modular architecture:

- **CLI Layer**: User entry point, argument parsing, project detection, and lifecycle orchestration.
- **Execution Engine**: Autonomous loop coordinating planning, tool execution, and stopping conditions.
- **Agent Abstraction**: Provider-agnostic AI interface responsible for prompt execution and tool calls.
- **Tool System**: Typed, validated tools grouped by domain (filesystem, git, shell, etc.).
- **State & Persistence**: `.sheen/` directory storing context, plans, configuration, and execution history.

### Key Design Decisions

- Introduce an explicit `AIAgent` interface to abstract LLM providers.
- Preserve the existing OpenCode-based engine behind a compatibility adapter during migration.
- Keep tool semantics stable while reimplementing tool definitions using AI SDK-native constructs.
- Enforce safety-first execution: bounded iterations, validation, and non-destructive defaults.
- Maintain strict TypeScript typing and high test coverage as non-negotiable constraints.

---

## API Contracts

### AIAgent Interface

```ts
interface AIAgent {
  execute(prompt: string, context: AgentContext): Promise<AgentResult>;
  stream?(prompt: string, context: AgentContext): AsyncIterable<AgentEvent>;
  registerTools(tools: ToolDefinition[]): void;
}
```

### Tool Definition Contract

```ts
interface ToolDefinition<Input, Output> {
  name: string;
  description: string;
  schema: ZodSchema<Input>;
  run(input: Input, ctx: ToolContext): Promise<Output>;
}
```

### Execution Loop Contract

```ts
interface ExecutionLoop {
  run(plan: TaskPlan): Promise<ExecutionResult>;
  stop(reason: StopReason): void;
}
```

---

## Module Structure

### Existing Core Modules

- `src/cli/` – CLI entry, commands, flags, UX
- `src/core/` – Agent orchestration, execution loop
- `src/tools/` – Tool registry and implementations
- `src/project/` – Project detection and context building
- `src/state/` – Persistence and resumability

### New / Evolving Modules

- `src/ai/`
  - `agent.ts` – `AIAgent` interface
  - `opencode-adapter.ts` – Adapter wrapping current OpenCode subprocess
  - `sdk-agent.ts` – Direct AI SDK implementation (feature-flagged)

- `src/context/`
  - Context window management
  - Summarization and pruning utilities

---

## Test Strategy

### Unit Tests

- Validate all tool schemas and execution paths
- Test `AIAgent` implementations with mocked providers
- Verify execution loop stopping conditions and error handling
- Ensure context pruning and summarization logic is deterministic

### Integration Tests

- End-to-end CLI runs on sample projects
- Tool execution with filesystem and git sandboxes
- Regression tests to ensure OpenCode parity during migration

### Safety & Regression

- Explicit tests for non-destructive behavior
- Snapshot tests for generated plans and summaries
- Windows-first validation with cross-platform CI follow-up

---

## Implementation Steps

### Phase 1: Agent Abstraction

1. Define `AIAgent` interface
2. Wrap existing OpenCode client in adapter
3. Route execution loop through interface
4. Add feature flag for agent selection

### Phase 2: Tool System Migration

1. Reimplement tools using AI SDK-native `tool()` definitions
2. Preserve existing schemas and validation semantics
3. Add adapter layer for backward compatibility

### Phase 3: Context Management

1. Introduce context window tracking
2. Implement pruning and summarization strategies
3. Add token usage monitoring hooks

### Phase 4: Stabilization

1. Expand integration test coverage
2. Dogfood autonomous runs on real projects
3. Collect performance and token metrics

---

## Risks & Mitigations

- **Behavioral Drift**: Use golden tests to compare OpenCode vs SDK runs
- **Context Explosion**: Enforce hard limits and summarization checkpoints
- **UX Complexity**: Keep CLI defaults simple; hide advanced flags

---

## Exit Criteria

- OpenCode and SDK agents produce equivalent results on core workflows
- All tools function through the new abstraction layer
- Tests pass with no regression
- Documentation updated to reflect new architecture

---

PLAN COMPLETE - Ready for Implementation
