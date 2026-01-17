/**
 * GitHub Models Provider for AI SDK
 * 
 * Uses GitHub's Models API (Azure AI Inference compatible)
 * 
 * Features:
 * - Access to Claude Sonnet 4.5, GPT-5, Gemini 2.5 Pro, etc.
 * - Uses GitHub Personal Access Token (models:read scope)
 * - Free tier available with GitHub Copilot subscription
 * - Azure AI Inference compatible API
 * 
 * Authentication:
 * - Requires GitHub Personal Access Token with 'models:read' scope
 * - Set via GITHUB_TOKEN environment variable or config
 * 
 * Rate Limits:
 * - Depends on GitHub Copilot subscription tier
 * - See: https://docs.github.com/en/github-models/use-github-models/prototyping-with-ai-models#rate-limits
 */

import { LanguageModel } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

/**
 * GitHub Models API endpoint
 */
const GITHUB_MODELS_ENDPOINT = 'https://models.inference.ai.azure.com';

/**
 * Create GitHub Models provider using OpenAI-compatible API
 * 
 * GitHub Models uses an OpenAI-compatible API, so we can use @ai-sdk/openai
 * with a custom base URL.
 * 
 * @param model - Model name (e.g., 'claude-sonnet-4.5', 'gpt-5', 'gemini-2.5-pro')
 * @param apiKey - GitHub Personal Access Token (needs models:read scope)
 * @returns LanguageModel instance
 */
export function createGitHubModels(model: string, apiKey: string): LanguageModel {
  // Create OpenAI-compatible provider with GitHub Models endpoint
  const github = createOpenAI({
    baseURL: GITHUB_MODELS_ENDPOINT,
    apiKey: apiKey,
  });

  // Return model instance
  return github(model);
}

/**
 * Get GitHub token from environment or config
 */
export function getGitHubToken(configToken?: string): string | undefined {
  // Check config first
  if (configToken) {
    return configToken;
  }

  // Check environment variables (in priority order)
  return process.env.GITHUB_TOKEN || 
         process.env.GH_TOKEN || 
         process.env.GITHUB_PAT;
}

/**
 * Validate GitHub token is available
 */
export function validateGitHubToken(configToken?: string): boolean {
  const token = getGitHubToken(configToken);
  return !!token && token.length > 0;
}

/**
 * Available models on GitHub Models
 * 
 * Note: This is not exhaustive - GitHub Models supports many models.
 * Check https://github.com/marketplace/models for full list.
 */
export const GITHUB_MODELS = {
  // Claude (Anthropic)
  CLAUDE_SONNET_45: 'claude-sonnet-4.5',
  CLAUDE_SONNET_4: 'claude-sonnet-4',
  CLAUDE_OPUS_45: 'claude-opus-4.5',
  CLAUDE_OPUS_41: 'claude-opus-41',
  CLAUDE_HAIKU_45: 'claude-haiku-4.5',
  
  // GPT (OpenAI)
  GPT_5: 'gpt-5',
  GPT_51: 'gpt-5.1',
  GPT_52: 'gpt-5.2',
  GPT_5_CODEX: 'gpt-5-codex',
  GPT_5_MINI: 'gpt-5-mini',
  GPT_4O: 'gpt-4o',
  GPT_41: 'gpt-4.1',
  
  // Gemini (Google)
  GEMINI_25_PRO: 'gemini-2.5-pro',
  GEMINI_3_PRO: 'gemini-3-pro-preview',
  GEMINI_3_FLASH: 'gemini-3-flash-preview',
  
  // Grok (xAI)
  GROK_CODE_FAST_1: 'grok-code-fast-1',
} as const;

/**
 * Default model for GitHub Models
 */
export const DEFAULT_GITHUB_MODEL = GITHUB_MODELS.CLAUDE_SONNET_45;
