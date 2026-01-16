# Discovery Findings

## Project Overview
Sheen is a global Node.js CLI tool designed as an autonomous coding agent with human oversight. It detects project context, generates execution plans, and autonomously carries out multi-step development tasks using a controlled execution loop and a typed tool system. The current stable release is v0.1.0.

## Documentation Reviewed
- `.sheen/plan.md`: Active execution plan plus a detailed roadmap for migrating from OpenCode subprocess integration to direct Vercel AI SDK usage.
- `README.md`: Vision, feature set, architecture, development workflow, and current status.
- `PROJECT_STATUS.md`, `PLAN.md`, `PLAN_v0.1.0.md`: Historical planning, milestones, and release tracking.
- `.sheen/context.md` and templates under `templates/`: Project context detection and initialization scaffolding.
- Test suites and logs under `tests/` and `logs/` to validate current behavior and maturity.

## Current Architecture
- **CLI Layer**: Global command entry point, argument parsing, project detection, and initialization of `.sheen/` state.
- **Agent & Execution Loop**: Central orchestrator controlling multi-iteration execution, progress detection, and stopping criteria.
- **LLM Integration**: OpenCode-based subprocess client handling streaming responses and tool-call translation.
- **Tool System**: Registry-driven, strongly typed tools grouped into file, git, and shell domains, each with validation and tests.
- **Project State**: `.sheen/` directory holding plan, context, configuration, and execution history for resumability.

## Design Principles Observed
- Modular, separation-of-concerns architecture
- Test-driven development with high coverage and strict TypeScript
- Safety-first autonomous execution (guards, limits, validation)
- Extensibility for new tools, execution engines, and agent capabilities

## Functional Requirements Identified
- Operate as a global CLI across heterogeneous project types
- Autonomously execute tasks with bounded iterations and error handling
- Allow human oversight and future live intervention
- Persist execution context across runs
- Maintain cross-platform compatibility (Windows validated)

## Constraints & Assumptions
- Backward compatibility with existing OpenCode-based engine during transition
- No destructive operations without explicit safeguards
- Respect project ignore patterns and configuration
- Performance and token usage must remain predictable for long-running sessions

## Strategic Direction
- **Short-term**: Dogfood and stabilize the existing v0.1.0 feature set.
- **Mid-term**: Introduce a feature-flagged direct AI SDK integration to replace OpenCode subprocess usage.
- **Long-term**: Enable multi-agent orchestration, advanced context management, and richer observability.

## Forward Technical Approach
- Abstract LLM interaction behind a provider-agnostic `AIAgent` interface.
- Reimplement tools using AI SDK-native `tool()` definitions while preserving semantics.
- Add context window management, pruning, and summarization.
- Incrementally migrate production paths and retire OpenCode once parity and stability are confirmed.

## Risks & Open Questions
- Ensuring behavioral parity between OpenCode and direct AI SDK tool execution.
- Managing context growth and token costs in autonomous loops.
- Designing a clear UX for live human oversight without breaking autonomy.

---

DISCOVERY COMPLETE - Ready for Planning
