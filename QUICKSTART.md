# Sheen Quick Start

Get up and running with Sheen in 5 minutes.

## Installation

```bash
# Clone and install globally
git clone https://github.com/ClaytonHunt/sheen.git
cd sheen
npm install
npm run build
npm link

# Verify installation
sheen --version
```

## Authentication

Choose your AI provider and authenticate:

### Option 1: GitHub Models (Recommended)

Access Claude Sonnet 4.5, GPT-5, Gemini 2.5 Pro using GitHub Copilot credits:

```bash
# Authenticate (uses your gh CLI token automatically)
sheen login github

# See available models
sheen models github
```

### Option 2: Direct Providers

Or use direct API access:

```bash
# Anthropic
sheen login anthropic

# OpenAI
sheen login openai

# Google
sheen login google

# See what you're authenticated with
sheen auth list
```

## Configuration

### GitHub Models (AI SDK)

Create `.sheen/config.json` in your project:

```json
{
  "ai": {
    "engine": "direct-ai-sdk",
    "provider": "github",
    "model": "claude-sonnet-4.5",
    "maxSteps": 10,
    "timeout": 300000,
    "maxTokens": 200000,
    "contextWindowSize": 180000,
    "enablePruning": true
  }
}
```

### OpenCode (Default)

Or stick with OpenCode CLI:

```json
{
  "opencode": {
    "model": "github-copilot/claude-sonnet-4.5",
    "agent": "general",
    "streamOutput": true,
    "timeout": 300000
  }
}
```

## Usage

```bash
# Initialize in your project
cd /path/to/your-project
sheen init

# Run with a prompt
sheen "add user authentication with email and password"

# Auto-resume from plan
sheen --auto

# Continue previous session
sheen --continue

# Verbose output for debugging
sheen --verbose "your task"
```

## Available Commands

```bash
# Authentication
sheen login <provider>       # Authenticate with a provider
sheen logout <provider>      # Remove authentication
sheen auth list              # Show authenticated providers
sheen models [provider]      # List available models

# Project
sheen init                   # Initialize .sheen/ directory
sheen "your task"            # Run agent with a task
sheen --auto                 # Resume from plan.md
sheen --continue             # Continue previous session

# Options
--verbose, -v                # Show debug output
--config <path>              # Use custom config
--max-iterations <n>         # Set max iterations
--approve-all                # Skip confirmations
```

## Available Models

### GitHub Models (via AI SDK)

**Claude (Anthropic):**
- `claude-sonnet-4.5` ⭐ Recommended
- `claude-opus-4.5`
- `claude-haiku-4.5`

**GPT (OpenAI):**
- `gpt-5`
- `gpt-5.1`
- `gpt-5-codex`

**Gemini (Google):**
- `gemini-2.5-pro`
- `gemini-3-pro-preview`

**See all:** `sheen models`

### Direct API

**Anthropic:**
- `claude-3-5-sonnet-20241022`

**OpenAI:**
- `gpt-4-turbo`

**Google:**
- `gemini-1.5-pro`

## Examples

### Add a new feature

```bash
sheen "add a REST API endpoint for user profile with GET and PUT"
```

### Fix a bug

```bash
sheen "fix the authentication bug where tokens expire too quickly"
```

### Refactor code

```bash
sheen "refactor the database layer to use dependency injection"
```

### Add tests

```bash
sheen "add unit tests for the authentication service"
```

## Configuration Options

### AI SDK Config

```json
{
  "ai": {
    "engine": "direct-ai-sdk",      // Use AI SDK directly
    "provider": "github",             // github, anthropic, openai, google
    "model": "claude-sonnet-4.5",    // Model ID
    "maxSteps": 10,                  // Max AI reasoning steps
    "timeout": 300000,               // 5 minutes
    "maxTokens": 200000,             // Context limit
    "contextWindowSize": 180000,     // Working context
    "enablePruning": true            // Auto-prune old context
  }
}
```

### OpenCode Config

```json
{
  "opencode": {
    "model": "github-copilot/claude-sonnet-4.5",
    "agent": "general",              // Prevents question prompts
    "streamOutput": true,            // Show AI output
    "timeout": 300000                // 5 minutes
  }
}
```

## Troubleshooting

### Authentication Issues

```bash
# Check authentication
sheen auth list

# Re-authenticate
sheen logout github
sheen login github
```

### Can't find models

```bash
# Make sure you're authenticated
sheen login github

# Then list models
sheen models
```

### Agent asks questions

If using OpenCode, make sure `agent: "general"` is set in config.

### Output not streaming

If using OpenCode and output appears all at once after timeout, switch to AI SDK:

```json
{
  "ai": {
    "engine": "direct-ai-sdk",
    "provider": "github",
    "model": "claude-sonnet-4.5"
  }
}
```

## Next Steps

- Read [OAUTH_SETUP.md](OAUTH_SETUP.md) for OAuth configuration
- Check [MULTI_AGENT_PLAN.md](MULTI_AGENT_PLAN.md) for future features
- Report issues: https://github.com/ClaytonHunt/sheen/issues

## Tips

1. **Start small** - Test with simple tasks first
2. **Use verbose mode** - `--verbose` helps debug issues
3. **Check the plan** - Review `.sheen/plan.md` to see what it's planning
4. **GitHub Models** - Best for access to latest models with Copilot credits
5. **Direct API** - Best for production use with your own API keys

Happy coding with Sheen! 🚀
