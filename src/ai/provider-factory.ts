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

/**
 * Default models for each provider
 */
const DEFAULT_MODELS = {
  anthropic: 'claude-3-5-sonnet-20241022',
  openai: 'gpt-4-turbo',
  google: 'gemini-1.5-pro',
};

/**
 * Create a language model instance based on AI configuration
 */
export function createProvider(config: AIConfig): LanguageModel {
  const provider = config.provider;
  const model = config.model || DEFAULT_MODELS[provider];

  logger.debug('Creating AI provider', { provider, model });

  switch (provider) {
    case 'anthropic':
      return createAnthropicProvider(model, config);
    case 'openai':
      return createOpenAIProvider(model, config);
    case 'google':
      return createGoogleProvider(model, config);
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

/**
 * Create Anthropic (Claude) provider
 */
function createAnthropicProvider(model: string, config: AIConfig): LanguageModel {
  const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('Anthropic API key not found. Set ANTHROPIC_API_KEY environment variable or configure in .sheenconfig');
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
  const apiKey = config.apiKey || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API key not found. Set OPENAI_API_KEY environment variable or configure in .sheenconfig');
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
  const apiKey = config.apiKey || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error('Google API key not found. Set GOOGLE_API_KEY environment variable or configure in .sheenconfig');
  }

  logger.info('Using Google provider', { model });

  // Set API key in environment if not already set
  if (!process.env.GOOGLE_API_KEY && apiKey) {
    process.env.GOOGLE_API_KEY = apiKey;
  }

  return google(model);
}

/**
 * Get API key for a provider from environment or config
 */
export function getApiKey(provider: 'anthropic' | 'openai' | 'google', config?: AIConfig): string | undefined {
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
  }
}

/**
 * Validate that API key is available for a provider
 */
export function validateApiKey(provider: 'anthropic' | 'openai' | 'google', config?: AIConfig): boolean {
  const apiKey = getApiKey(provider, config);
  return !!apiKey && apiKey.length > 0;
}

/**
 * Get list of available providers (those with valid API keys)
 */
export function getAvailableProviders(config?: AIConfig): Array<'anthropic' | 'openai' | 'google'> {
  const providers: Array<'anthropic' | 'openai' | 'google'> = [];

  if (validateApiKey('anthropic', config)) {
    providers.push('anthropic');
  }
  if (validateApiKey('openai', config)) {
    providers.push('openai');
  }
  if (validateApiKey('google', config)) {
    providers.push('google');
  }

  return providers;
}

/**
 * Get default model for a provider
 */
export function getDefaultModel(provider: 'anthropic' | 'openai' | 'google'): string {
  return DEFAULT_MODELS[provider];
}
