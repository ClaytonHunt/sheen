# Sheen Execution Plan

**Created**: 2026-01-16T21:50:29.387Z
**Updated**: 2026-01-16 (Added AI SDK integration roadmap)
**Project**: nodejs (D:\projects\sheen)

## Current Tasks

### Task task_1768600229386_vy89gq 🔄

**Description**: test prompt
**Status**: in_progress
**Priority**: HIGH
**Phase**: implementation
**Created**: 2026-01-16T21:50:29.386Z
**Started**: 2026-01-16T21:50:29.387Z

---

## Future Enhancements

### Phase 1: Direct AI SDK Integration (Post-MVP)

**Goal**: Replace OpenCode subprocess calls with direct Vercel AI SDK integration for better performance, control, and reliability in autonomous operations.

**Priority**: HIGH (after core features are complete)
**Estimated Effort**: 2-3 weeks
**Motivation**: 
- Avoid OpenCode middleware bugs (e.g., UIMessage/ModelMessage conversion)
- 30-50% performance improvement (no subprocess overhead)
- Native tool calling with automatic multi-step reasoning
- Better error handling and debugging
- Full control over conversation loop for autonomous operation

#### Tasks:

**1.1: Install Dependencies and Setup**
- Install: `npm install ai @ai-sdk/anthropic @ai-sdk/openai zod`
- Add API key configuration for direct provider access
- Create feature flag in config: `ai.engine: "opencode" | "direct-ai-sdk"`
- **Estimated**: 2 hours

**1.2: Create AIAgent Class**
- Implement new `src/core/ai-agent.ts` class (replace OpenCodeClient)
- Use `streamText()` and `generateText()` from AI SDK
- Implement conversation history management with `CoreMessage[]`
- Add streaming support with `onStepFinish` callbacks
- **Estimated**: 4-6 hours
- **Reference**: See `poc-direct-ai-sdk.ts` for working example

**1.3: Port Tools to AI SDK Format**
Core tools to implement using `tool()` from AI SDK:
- `bash` - Execute shell commands ⭐ CRITICAL
- `read` - Read file contents ⭐ CRITICAL
- `write` - Create new files ⭐ CRITICAL
- `edit` - Modify files with exact string replacement ⭐ CRITICAL
- `grep` - Search file contents with regex
- `glob` - Find files by pattern
- `todowrite` / `todoread` - Task list management
- **Estimated**: 8-10 hours
- **Reference**: See `sheenTools` in `poc-direct-ai-sdk.ts`

**1.4: Implement Safety & Permission System**
- Create `PermissionManager` class
- Support allow/deny/ask patterns per tool
- Add `.gitignore` respect for file operations
- Implement output limits and truncation
- Add destructive action guards (e.g., rm -rf detection)
- **Estimated**: 4-6 hours

**1.5: Update Execution Loop**
- Modify `src/core/loop.ts` to support both OpenCode and direct AI SDK
- Use feature flag to switch between implementations
- Maintain backward compatibility during transition
- Add comprehensive error handling for AI SDK errors
- **Estimated**: 4-6 hours

**1.6: Context Window Management**
- Implement automatic context trimming when approaching token limits
- Smart message pruning (keep system prompt, recent context)
- Add conversation summarization for long sessions
- Token counting and usage tracking
- **Estimated**: 3-4 hours

**1.7: Testing & Validation**
- Create integration tests for AIAgent class
- Test all tools with real file operations
- Compare performance: OpenCode vs Direct AI SDK
- Validate token usage optimization
- Load testing with parallel agent execution
- **Estimated**: 6-8 hours

**1.8: Migration & Cleanup**
- Migrate all production usage to direct AI SDK
- Remove OpenCode dependency from package.json
- Update documentation
- Archive OpenCode client code
- **Estimated**: 2-3 hours

#### Documentation Reference:
- `DIRECT_AI_SDK_ANALYSIS.md` - Comprehensive analysis and comparison
- `poc-direct-ai-sdk.ts` - Working proof-of-concept implementation
- `TEST_RESULTS.md` - Test results and recommendations

#### Success Metrics:
- ✅ All core tools working with AI SDK
- ✅ 30%+ performance improvement over OpenCode
- ✅ Zero middleware-related bugs
- ✅ Successful autonomous task completion
- ✅ Token usage within acceptable limits

---

### Phase 2: Advanced Autonomous Features (Post-AI SDK)

**2.1: Multi-Agent Orchestration**
- Support parallel task execution with multiple agents
- Agent coordination and communication
- Shared state management
- **Estimated**: 1-2 weeks

**2.2: Enhanced Context Management**
- Semantic code search integration
- Intelligent codebase summarization
- Dependency graph analysis
- **Estimated**: 1 week

**2.3: Advanced Safety Features**
- Sandbox execution environment
- Rollback mechanism for failed changes
- Automated testing before commits
- Cost controls and token budgets
- **Estimated**: 1 week

**2.4: Monitoring & Observability**
- Real-time progress dashboard
- Token usage analytics
- Performance metrics
- Error tracking and alerting
- **Estimated**: 1 week

**2.5: LSP Integration (Experimental)**
- Code intelligence (go-to-definition, find references)
- Type-aware refactoring
- Better code understanding
- **Estimated**: 1-2 weeks

---

## Notes

- Keep OpenCode integration working as fallback during AI SDK development
- Use feature flags for gradual rollout
- Prioritize autonomous operation features over interactive features
- Focus on reliability and safety for production use
