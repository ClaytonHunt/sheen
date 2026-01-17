/**
 * ProviderFactory - Creates AI SDK provider instances
 * 
 * Supports:
 * - Anthropic (Claude)
 * - OpenAI (GPT)
 * - Google (Gemini)
 * 
 * Handles:
 * - API key loading from config or environment
 * - Model selection
 * - Provider-specific configuration
 */

import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';
import type { AIConfig } from '../utils/types';
import { logger } from '../utils/logger';
import { createGitHubModels, getGitHubToken, GITHUB_MODELS } from './github-provider';

// Auth storage cache (loaded once)
let authCache: Record<string, string> | null = null;

/**
 * Load auth storage synchronously
 */
async function loadAuthCache(): Promise<void> {
  if (authCache) return;
  
  try {
    const { getAuthManager } = await import('../auth/storage.js');
    const authManager = await getAuthManager();
    
    // Load all tokens into cache
    authCache = {};
    const providers = ['github', 'anthropic', 'openai', 'google'] as const;
    
    for (const provider of providers) {
      const token = await authManager.getToken(provider);
      if (token) {
        authCache[provider] = token;
      }
    }
    
    logger.debug('Loaded auth cache', { providers: Object.keys(authCache) });
  } catch (error) {
    // Auth storage not available, use env vars only
    authCache = {};
    logger.debug('Auth storage not available, using environment variables only');
  }
}

/**
 * Get cached auth token
 */
function getCachedToken(provider: string): string | undefined {
  return authCache?.[provider];
}

/**
 * Default models for each provider
 */
const DEFAULT_MODELS = {
  anthropic: 'claude-3-5-sonnet-20241022',
  openai: 'gpt-4-turbo',
  google: 'gemini-1.5-pro',
  github: 'claude-sonnet-4.5', // GitHub Models default
};

/**
 * Create a language model instance based on AI configuration
 */
export async function createProvider(config: AIConfig): Promise<LanguageModel> {
  const provider = config.provider;
  const model = config.model || DEFAULT_MODELS[provider];

  // Load auth cache first
  await loadAuthCache();

  logger.debug('Creating AI provider', { provider, model });

  switch (provider) {
    case 'anthropic':
      return createAnthropicProvider(model, config);
    case 'openai':
      return createOpenAIProvider(model, config);
    case 'google':
      return createGoogleProvider(model, config);
    case 'github':
      return createGitHubProvider(model, config);
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

/**
 * Create Anthropic (Claude) provider
 */
function createAnthropicProvider(model: string, config: AIConfig): LanguageModel {
  const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || getCachedToken('anthropic');

  if (!apiKey) {
    throw new Error('Anthropic API key not found. Run "sheen login anthropic" or set ANTHROPIC_API_KEY environment variable');
  }

  logger.info('Using Anthropic provider', { model });

  // Set API key in environment if not already set
  if (!process.env.ANTHROPIC_API_KEY && apiKey) {
    process.env.ANTHROPIC_API_KEY = apiKey;
  }

  return anthropic(model);
}

/**
 * Create OpenAI (GPT) provider
 */
function createOpenAIProvider(model: string, config: AIConfig): LanguageModel {
  const apiKey = config.apiKey || process.env.OPENAI_API_KEY || getCachedToken('openai');

  if (!apiKey) {
    throw new Error('OpenAI API key not found. Run "sheen login openai" or set OPENAI_API_KEY environment variable');
  }

  logger.info('Using OpenAI provider', { model });

  // Set API key in environment if not already set
  if (!process.env.OPENAI_API_KEY && apiKey) {
    process.env.OPENAI_API_KEY = apiKey;
  }

  return openai(model);
}

/**
 * Create Google (Gemini) provider
 */
function createGoogleProvider(model: string, config: AIConfig): LanguageModel {
  const apiKey = config.apiKey || process.env.GOOGLE_API_KEY || getCachedToken('google');

  if (!apiKey) {
    throw new Error('Google API key not found. Run "sheen login google" or set GOOGLE_API_KEY environment variable');
  }

  logger.info('Using Google provider', { model });

  // Set API key in environment if not already set
  if (!process.env.GOOGLE_API_KEY && apiKey) {
    process.env.GOOGLE_API_KEY = apiKey;
  }

  return google(model);
}

/**
 * Create GitHub Models provider
 */
function createGitHubProvider(model: string, config: AIConfig): LanguageModel {
  const apiKey = config.apiKey || getGitHubToken() || getCachedToken('github');

  if (!apiKey) {
    throw new Error('GitHub token not found. Run "sheen login github" or set GITHUB_TOKEN environment variable');
  }

  logger.info('Using GitHub Models provider', { model });

  return createGitHubModels(model, apiKey);
}

/**
 * Get API key for a provider from environment or config
 */
export function getApiKey(provider: 'anthropic' | 'openai' | 'google' | 'github', config?: AIConfig): string | undefined {
  // Check config first
  if (config?.apiKey) {
    return config.apiKey;
  }

  // Check environment variables
  switch (provider) {
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY;
    case 'openai':
      return process.env.OPENAI_API_KEY;
    case 'google':
      return process.env.GOOGLE_API_KEY;
    case 'github':
      return getGitHubToken();
  }
}

/**
 * Validate that API key is available for a provider
 */
export function validateApiKey(provider: 'anthropic' | 'openai' | 'google' | 'github', config?: AIConfig): boolean {
  const apiKey = getApiKey(provider, config);
  return !!apiKey && apiKey.length > 0;
}

/**
 * Get list of available providers (those with valid API keys)
 */
export function getAvailableProviders(config?: AIConfig): Array<'anthropic' | 'openai' | 'google' | 'github'> {
  const providers: Array<'anthropic' | 'openai' | 'google' | 'github'> = [];

  if (validateApiKey('anthropic', config)) {
    providers.push('anthropic');
  }
  if (validateApiKey('openai', config)) {
    providers.push('openai');
  }
  if (validateApiKey('google', config)) {
    providers.push('google');
  }
  if (validateApiKey('github', config)) {
    providers.push('github');
  }

  return providers;
}

/**
 * Get default model for a provider
 */
export function getDefaultModel(provider: 'anthropic' | 'openai' | 'google' | 'github'): string {
  return DEFAULT_MODELS[provider];
}
