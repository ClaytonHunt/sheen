# Direct AI SDK Integration Analysis

## Executive Summary

**Should you bypass OpenCode and use Vercel AI SDK directly?**

**Answer: Yes, for autonomous development.** Here's why:

1. ✅ **Full Control**: You control the conversation loop, tool execution, and error handling
2. ✅ **No Middleware Bugs**: Avoid bugs like the UIMessage/ModelMessage conversion issue
3. ✅ **Better Integration**: Direct access to streaming, tool calling, and context management
4. ✅ **Autonomous-First**: Design the system specifically for autonomous operation
5. ⚠️ **More Work**: You need to recreate OpenCode's tools and UX features

---

## What OpenCode Provides (That You'd Need to Recreate)

### 1. **Core AI Integration** ⭐ CRITICAL
- **Multi-provider support** (Anthropic, OpenAI, Google, etc.)
- **Streaming responses** with real-time output
- **Tool calling protocol** with proper formatting
- **Context management** and conversation history
- **Token counting and limits**

**Difficulty**: Medium
**Required**: Yes for autonomous dev

### 2. **Built-in Tools** ⭐ CRITICAL
OpenCode provides 14+ built-in tools:

| Tool | Purpose | Autonomous Necessity |
|------|---------|---------------------|
| `bash` | Execute shell commands | **CRITICAL** - Run tests, git, build |
| `edit` | Modify files (exact string replacement) | **CRITICAL** - Code changes |
| `write` | Create new files | **CRITICAL** - New features |
| `read` | Read file contents | **CRITICAL** - Understanding code |
| `grep` | Search file contents (regex) | **HIGH** - Finding code patterns |
| `glob` | Find files by pattern | **HIGH** - Locating files |
| `todowrite`/`todoread` | Task list management | **HIGH** - Multi-step planning |
| `webfetch` | Fetch web content | **MEDIUM** - Documentation lookup |
| `question` | Ask user questions | **LOW** - Autonomous should minimize |
| `lsp` (experimental) | Code intelligence | **MEDIUM** - Better refactoring |
| `patch` | Apply patches | **LOW** - Edge case |
| `list` | Directory listing | **MEDIUM** - Exploration |

**Difficulty**: Medium (most are straightforward wrappers)
**Required**: Yes, need at least: bash, edit, write, read, grep, glob, todo

### 3. **Configuration System** ⭐ MEDIUM
- `.opencode/` directory structure
- `opencode.json` config file
- Permission system for tools
- Custom tools and commands
- Rules and agents

**Difficulty**: Low-Medium
**Required**: Partially - simplified config for autonomous mode

### 4. **Terminal UI (TUI)** ⭐ LOW (for autonomous)
- Interactive chat interface
- File attachment/drag-drop
- Syntax highlighting
- Plan/Build mode toggle
- Undo/Redo functionality
- Theme support

**Difficulty**: High
**Required**: No for autonomous dev (you want headless operation)

### 5. **Session Management** ⭐ MEDIUM
- Save/restore conversations
- Session history
- Export/import sessions
- Share functionality

**Difficulty**: Low-Medium
**Required**: Partially - need state persistence for long-running tasks

### 6. **Safety Features** ⭐ HIGH
- `.gitignore` respect
- Permission system (allow/deny/ask)
- File read limits
- Output truncation
- Sandbox execution

**Difficulty**: Medium
**Required**: Yes - prevent destructive actions

### 7. **Git Integration** ⭐ MEDIUM
- Auto-detect git state
- Commit tracking
- Branch awareness
- GitHub Actions integration

**Difficulty**: Low
**Required**: Partially - need git awareness for autonomous commits

### 8. **Code Formatters** ⭐ LOW
- Auto-format on write
- Multiple formatter support
- Per-file-type configuration

**Difficulty**: Low
**Required**: Nice to have

### 9. **MCP/Plugin System** ⭐ LOW (for MVP)
- Model Context Protocol servers
- Custom tool loading
- Plugin architecture
- ACP support

**Difficulty**: High
**Required**: Not for MVP, future enhancement

---

## What You'd Build with Vercel AI SDK

### Architecture Overview

```typescript
┌─────────────────────────────────────────────────┐
│              Sheen Autonomous Agent              │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────┐      ┌────────────────────┐  │
│  │   Planner    │──────│  Context Manager   │  │
│  │  (PLAN.md)   │      │  (conversation)    │  │
│  └──────────────┘      └────────────────────┘  │
│         │                       │               │
│         ▼                       ▼               │
│  ┌──────────────────────────────────────────┐  │
│  │        Execution Loop Controller         │  │
│  │  - Phase management (DISC/PLAN/IMPL/VAL) │  │
│  │  - Iteration control                     │  │
│  │  - Progress tracking                     │  │
│  └──────────────────────────────────────────┘  │
│         │                                       │
│         ▼                                       │
│  ┌──────────────────────────────────────────┐  │
│  │      Vercel AI SDK Integration           │  │
│  │  - streamText() / generateText()         │  │
│  │  - Tool calling (native)                 │  │
│  │  - Multiple providers                    │  │
│  │  - Streaming responses                   │  │
│  └──────────────────────────────────────────┘  │
│         │                                       │
│         ▼                                       │
│  ┌──────────────────────────────────────────┐  │
│  │         Tool Registry                    │  │
│  │  - bash, read, write, edit, grep, glob  │  │
│  │  - git, todo, analyzer                   │  │
│  └──────────────────────────────────────────┘  │
│         │                                       │
│         ▼                                       │
│  ┌──────────────────────────────────────────┐  │
│  │       File System / Git / Shell          │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Implementation Plan

#### Phase 1: Core AI Integration (2-3 hours)
```typescript
import { anthropic } from '@ai-sdk/anthropic';
import { streamText, generateText, tool } from 'ai';

// Replace OpenCodeClient with direct AI SDK usage
export class AIAgent {
  async execute(prompt: string, tools: Tool[]) {
    const result = await streamText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      messages: this.conversationHistory,
      tools: this.convertToolsToAISDKFormat(tools),
      maxSteps: 10, // Auto-execute tools up to 10 times
      onStepFinish: (step) => {
        // Handle tool calls and results
        this.handleToolExecution(step);
      }
    });
    
    return result;
  }
}
```

#### Phase 2: Tool Implementation (3-4 hours)
```typescript
// Define tools in AI SDK format
const tools = {
  bash: tool({
    description: 'Execute shell commands',
    parameters: z.object({
      command: z.string(),
      workdir: z.string().optional(),
    }),
    execute: async ({ command, workdir }) => {
      // Implementation
      return await executeShellCommand(command, workdir);
    }
  }),
  
  read: tool({
    description: 'Read file contents',
    parameters: z.object({
      filePath: z.string(),
      offset: z.number().optional(),
      limit: z.number().optional(),
    }),
    execute: async ({ filePath, offset, limit }) => {
      return await readFile(filePath, offset, limit);
    }
  }),
  
  // ... implement edit, write, grep, glob, etc.
};
```

#### Phase 3: Conversation Management (2 hours)
```typescript
export class ConversationManager {
  private messages: CoreMessage[] = [];
  
  addUserMessage(content: string) {
    this.messages.push({ role: 'user', content });
  }
  
  addAssistantMessage(content: string) {
    this.messages.push({ role: 'assistant', content });
  }
  
  addToolResult(toolCallId: string, result: any) {
    this.messages.push({
      role: 'tool',
      content: [{ type: 'tool-result', toolCallId, result }]
    });
  }
  
  getMessages(): CoreMessage[] {
    return this.messages;
  }
  
  // Context window management
  trimToContextWindow(maxTokens: number) {
    // Keep system prompt, remove old messages if needed
  }
}
```

#### Phase 4: Safety & Permissions (1-2 hours)
```typescript
export class PermissionManager {
  private permissions: Record<string, 'allow' | 'deny' | 'ask'> = {
    bash: 'allow',
    read: 'allow',
    write: 'ask', // Require approval for file changes in interactive mode
    edit: 'ask',
  };
  
  async checkPermission(tool: string, params: any): Promise<boolean> {
    const perm = this.permissions[tool] || 'ask';
    
    if (perm === 'allow') return true;
    if (perm === 'deny') return false;
    
    // In autonomous mode, auto-approve or use heuristics
    return await this.requestApproval(tool, params);
  }
}
```

---

## Direct Benefits of Using AI SDK Directly

### 1. **Native Tool Calling** 🚀
```typescript
// AI SDK handles tool calling natively
const result = await streamText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  tools: {
    bash: tool({ ... }),
    read: tool({ ... }),
  },
  maxSteps: 10, // Automatically executes tools!
});
```

No need to parse "TOOL_CALL: {...}" from text - it's built-in!

### 2. **Better Error Handling** 🛡️
```typescript
try {
  const result = await generateText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    messages: [...],
  });
} catch (error) {
  if (error instanceof APIError) {
    // Handle rate limits, token limits, etc.
  }
}
```

Direct access to error types and retry logic.

### 3. **Streaming with Tool Calls** 📡
```typescript
const result = streamText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  tools: { ... },
});

for await (const chunk of result.textStream) {
  console.log(chunk); // Real-time output
}
```

Get streaming text AND tool calls in one go.

### 4. **Multi-Step Reasoning** 🧠
```typescript
const result = await streamText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  tools: { ... },
  maxSteps: 5, // Agent can use tools multiple times
});
```

AI SDK automatically orchestrates multi-step tool usage!

### 5. **Provider Flexibility** 🔄
```typescript
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';

// Switch models easily
const model = config.provider === 'openai' 
  ? openai('gpt-4-turbo')
  : anthropic('claude-3-5-sonnet-20241022');
```

---

## Implementation Roadmap

### Week 1: Core Integration
- [ ] Add Vercel AI SDK dependencies
- [ ] Implement AIAgent class with streamText/generateText
- [ ] Port existing tools to AI SDK format (bash, read, write, edit)
- [ ] Set up conversation management
- [ ] Test basic autonomous loop

### Week 2: Feature Parity
- [ ] Implement remaining tools (grep, glob, todo)
- [ ] Add permission system
- [ ] Implement context window management
- [ ] Add error recovery
- [ ] Port existing phase detection logic

### Week 3: Refinement
- [ ] Add streaming output support
- [ ] Improve tool implementations
- [ ] Add safety guards
- [ ] Performance optimization
- [ ] Testing and documentation

---

## Code Example: Minimal Viable Implementation

```typescript
import { anthropic } from '@ai-sdk/anthropic';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

// Define tools
const tools = {
  bash: tool({
    description: 'Execute shell commands',
    parameters: z.object({
      command: z.string().describe('Shell command to execute'),
    }),
    execute: async ({ command }) => {
      try {
        const { stdout, stderr } = await execAsync(command);
        return { success: true, stdout, stderr };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  }),
  
  read: tool({
    description: 'Read file contents',
    parameters: z.object({
      filePath: z.string().describe('Path to file'),
    }),
    execute: async ({ filePath }) => {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        return { success: true, content };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  }),
  
  write: tool({
    description: 'Write content to file',
    parameters: z.object({
      filePath: z.string(),
      content: z.string(),
    }),
    execute: async ({ filePath, content }) => {
      try {
        await fs.writeFile(filePath, content, 'utf-8');
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  }),
};

// Main execution loop
export async function runAutonomousAgent(task: string) {
  const messages = [
    {
      role: 'system' as const,
      content: `You are an autonomous coding agent. Complete the given task using available tools.
      
Available tools:
- bash: Execute shell commands
- read: Read file contents  
- write: Write to files

Always explain your reasoning before using tools.`
    },
    {
      role: 'user' as const,
      content: task
    }
  ];

  const result = await streamText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    messages,
    tools,
    maxSteps: 10, // Allow up to 10 tool calls
    onStepFinish: (step) => {
      console.log('Step finished:', step.stepType);
      if (step.toolCalls) {
        console.log('Tool calls:', step.toolCalls);
      }
    },
  });

  // Stream the response
  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }
  
  return result;
}
```

---

## Recommendation

### ✅ **Use Vercel AI SDK Directly**

**Reasons:**
1. You're building an **autonomous agent**, not an interactive chat
2. OpenCode's TUI and interactive features are overhead you don't need
3. Direct control over conversation loop is crucial for autonomous operation
4. Native tool calling is much cleaner than parsing text
5. Better debugging and error handling
6. No dependency on OpenCode's release schedule or bugs

**Keep from OpenCode:**
- Tool concepts (bash, read, write, edit, grep, glob)
- Permission/safety patterns
- Configuration approach

**Build yourself:**
- Direct AI SDK integration
- Autonomous execution loop
- Phase management
- Progress tracking
- Tool registry

---

## Next Steps

1. **Install Vercel AI SDK**
   ```bash
   npm install ai @ai-sdk/anthropic @ai-sdk/openai zod
   ```

2. **Create new AIAgent class**
   - Replace `OpenCodeClient` with direct AI SDK usage
   - Port tool definitions to AI SDK format

3. **Test incrementally**
   - Start with simple tasks
   - Add tools one by one
   - Validate autonomous behavior

4. **Migrate gradually**
   - Keep OpenCode integration as fallback
   - Switch to AI SDK for core autonomous loop
   - Remove OpenCode dependency once stable

---

## Estimated Effort

- **Basic integration**: 4-6 hours
- **Feature parity**: 1-2 weeks  
- **Production ready**: 2-3 weeks

**Worth it?** Absolutely, for an autonomous agent focused on long-running tasks.
