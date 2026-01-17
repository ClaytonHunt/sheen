/**
 * Models CLI Command
 * 
 * Lists available models for authenticated providers
 */

import { Command } from 'commander';
import { Logger } from '../utils/logger.js';
import { getAuthManager } from '../auth/storage.js';
import { GITHUB_MODELS } from '../ai/github-provider.js';

const logger = new Logger('info');

/**
 * Available models by provider
 */
const MODELS = {
  github: {
    name: 'GitHub Models',
    models: [
      { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5', provider: 'Anthropic', tier: 'high' },
      { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic', tier: 'high' },
      { id: 'claude-opus-4.5', name: 'Claude Opus 4.5', provider: 'Anthropic', tier: 'high' },
      { id: 'claude-opus-41', name: 'Claude Opus 4.1', provider: 'Anthropic', tier: 'high' },
      { id: 'claude-haiku-4.5', name: 'Claude Haiku 4.5', provider: 'Anthropic', tier: 'low' },
      { id: 'gpt-5', name: 'GPT-5', provider: 'OpenAI', tier: 'high' },
      { id: 'gpt-5.1', name: 'GPT-5.1', provider: 'OpenAI', tier: 'high' },
      { id: 'gpt-5.2', name: 'GPT-5.2', provider: 'OpenAI', tier: 'high' },
      { id: 'gpt-5-codex', name: 'GPT-5 Codex', provider: 'OpenAI', tier: 'high' },
      { id: 'gpt-5-mini', name: 'GPT-5 Mini', provider: 'OpenAI', tier: 'low' },
      { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', tier: 'high' },
      { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'OpenAI', tier: 'high' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', tier: 'high' },
      { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Preview)', provider: 'Google', tier: 'high' },
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview)', provider: 'Google', tier: 'low' },
      { id: 'grok-code-fast-1', name: 'Grok Code Fast 1', provider: 'xAI', tier: 'low' },
    ],
  },
  anthropic: {
    name: 'Anthropic (Direct)',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', tier: 'high' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'Anthropic', tier: 'low' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'Anthropic', tier: 'high' },
    ],
  },
  openai: {
    name: 'OpenAI (Direct)',
    models: [
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI', tier: 'high' },
      { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI', tier: 'high' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI', tier: 'low' },
    ],
  },
  google: {
    name: 'Google (Direct)',
    models: [
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google', tier: 'high' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'Google', tier: 'low' },
    ],
  },
};

/**
 * Models command - List available models
 */
export function createModelsCommand(): Command {
  const cmd = new Command('models');
  
  cmd
    .description('List available AI models')
    .argument('[provider]', 'Show models for specific provider (github, anthropic, openai, google)')
    .action(async (providerArg?: string) => {
      try {
        const authManager = await getAuthManager();
        const authenticated = await authManager.list();
        
        if (authenticated.length === 0) {
          console.log('\n⚠️  No authenticated providers\n');
          logger.info('💡 Tip: Run "sheen login <provider>" to authenticate');
          return;
        }
        
        // Filter by provider if specified
        let providersToShow = authenticated.map(a => a.provider);
        
        if (providerArg) {
          const validProviders = ['github', 'anthropic', 'openai', 'google'];
          if (!validProviders.includes(providerArg)) {
            logger.error(`Invalid provider: ${providerArg}`);
            logger.info(`Valid providers: ${validProviders.join(', ')}`);
            process.exit(1);
          }
          
          if (!providersToShow.includes(providerArg as any)) {
            logger.error(`Not authenticated with ${providerArg}`);
            logger.info(`Run: sheen login ${providerArg}`);
            process.exit(1);
          }
          
          providersToShow = [providerArg as any];
        }
        
        console.log('\n🤖 Available AI Models\n');
        
        for (const provider of providersToShow) {
          const providerData = MODELS[provider as keyof typeof MODELS];
          if (!providerData) continue;
          
          const icon = provider === 'github' ? '🐙' : 
                      provider === 'anthropic' ? '🤖' :
                      provider === 'openai' ? '🧠' : '🔷';
          
          console.log(`${icon} ${providerData.name}`);
          console.log('─'.repeat(60));
          
          // Group by tier
          const highTier = providerData.models.filter(m => m.tier === 'high');
          const lowTier = providerData.models.filter(m => m.tier === 'low');
          
          if (highTier.length > 0) {
            console.log('\n  High Performance:');
            for (const model of highTier) {
              console.log(`    • ${model.name.padEnd(35)} ${model.id}`);
            }
          }
          
          if (lowTier.length > 0) {
            console.log('\n  Fast & Efficient:');
            for (const model of lowTier) {
              console.log(`    • ${model.name.padEnd(35)} ${model.id}`);
            }
          }
          
          console.log('');
        }
        
        console.log('💡 Usage:');
        console.log('  Add to .sheen/config.json:');
        console.log('  {');
        console.log('    "ai": {');
        console.log('      "engine": "direct-ai-sdk",');
        console.log('      "provider": "github",');
        console.log('      "model": "claude-sonnet-4.5"');
        console.log('    }');
        console.log('  }\n');
        
      } catch (error: any) {
        logger.error('Failed to list models', error);
        process.exit(1);
      }
    });
  
  return cmd;
}
