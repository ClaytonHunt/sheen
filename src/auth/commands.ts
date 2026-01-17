/**
 * Auth CLI Commands
 * 
 * Commands:
 * - sheen login <provider> - Login to a provider
 * - sheen logout <provider> - Logout from a provider  
 * - sheen auth list - List authenticated providers
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import { Logger } from '../utils/logger.js';
import { getAuthManager, ProviderType } from './storage.js';
import { authenticateWithGitHub } from './github-oauth.js';

const logger = new Logger('info');

/**
 * Login command - Authenticate with a provider
 */
export function createLoginCommand(): Command {
  const cmd = new Command('login');
  
  cmd
    .description('Authenticate with an AI provider')
    .argument('[provider]', 'Provider to authenticate with (github, anthropic, openai, google)')
    .action(async (providerArg?: string) => {
      try {
        let provider: ProviderType;
        
        // If no provider specified, prompt user
        if (!providerArg) {
          const answer = await inquirer.prompt([{
            type: 'list',
            name: 'provider',
            message: 'Select a provider to authenticate:',
            choices: [
              { name: '🐙 GitHub Models (OAuth)', value: 'github' },
              { name: '🤖 Anthropic (API Key)', value: 'anthropic' },
              { name: '🧠 OpenAI (API Key)', value: 'openai' },
              { name: '🔷 Google (API Key)', value: 'google' },
            ],
          }]);
          provider = answer.provider;
        } else {
          provider = providerArg as ProviderType;
        }
        
        // Validate provider
        const validProviders: ProviderType[] = ['github', 'anthropic', 'openai', 'google'];
        if (!validProviders.includes(provider)) {
          logger.error(`Invalid provider: ${provider}`);
          logger.info(`Valid providers: ${validProviders.join(', ')}`);
          process.exit(1);
        }
        
        const authManager = await getAuthManager();
        
        // Check if already authenticated
        if (await authManager.isAuthenticated(provider)) {
          const answer = await inquirer.prompt([{
            type: 'confirm',
            name: 'overwrite',
            message: `Already authenticated with ${provider}. Overwrite?`,
            default: false,
          }]);
          
          if (!answer.overwrite) {
            logger.info('Authentication cancelled');
            return;
          }
        }
        
        // Authenticate based on provider
        if (provider === 'github') {
          logger.info('🐙 Authenticating with GitHub...');
          const accessToken = await authenticateWithGitHub();
          await authManager.setOAuth(provider, accessToken);
          logger.success('✓ Successfully authenticated with GitHub!');
        } else {
          // Prompt for API key
          const answer = await inquirer.prompt([{
            type: 'password',
            name: 'apiKey',
            message: `Enter your ${provider} API key:`,
            mask: '*',
          }]);
          
          if (!answer.apiKey || answer.apiKey.trim().length === 0) {
            logger.error('No API key provided');
            process.exit(1);
          }
          
          await authManager.setApiKey(provider, answer.apiKey.trim());
          logger.success(`✓ Successfully authenticated with ${provider}!`);
        }
        
        logger.info('\n💡 Tip: Use "sheen models" to see available models');
        
      } catch (error: any) {
        logger.error('Authentication failed', error);
        process.exit(1);
      }
    });
  
  return cmd;
}

/**
 * Logout command - Remove authentication for a provider
 */
export function createLogoutCommand(): Command {
  const cmd = new Command('logout');
  
  cmd
    .description('Remove authentication for a provider')
    .argument('[provider]', 'Provider to logout from (github, anthropic, openai, google)')
    .action(async (providerArg?: string) => {
      try {
        const authManager = await getAuthManager();
        const authenticated = await authManager.list();
        
        if (authenticated.length === 0) {
          logger.info('No authenticated providers');
          return;
        }
        
        let provider: ProviderType;
        
        // If no provider specified, prompt user
        if (!providerArg) {
          const choices = authenticated.map(({ provider, type }) => ({
            name: `${provider} (${type})`,
            value: provider,
          }));
          
          const answer = await inquirer.prompt([{
            type: 'list',
            name: 'provider',
            message: 'Select a provider to logout from:',
            choices,
          }]);
          provider = answer.provider;
        } else {
          provider = providerArg as ProviderType;
        }
        
        // Confirm logout
        const answer = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: `Remove authentication for ${provider}?`,
          default: false,
        }]);
        
        if (!answer.confirm) {
          logger.info('Logout cancelled');
          return;
        }
        
        await authManager.remove(provider);
        logger.success(`✓ Logged out from ${provider}`);
        
      } catch (error: any) {
        logger.error('Logout failed', error);
        process.exit(1);
      }
    });
  
  return cmd;
}

/**
 * Auth list command - Show authenticated providers
 */
export function createAuthListCommand(): Command {
  const cmd = new Command('list');
  
  cmd
    .description('List authenticated providers')
    .alias('ls')
    .action(async () => {
      try {
        const authManager = await getAuthManager();
        const authenticated = await authManager.list();
        
        if (authenticated.length === 0) {
          console.log('\nNo authenticated providers\n');
          logger.info('💡 Tip: Use "sheen login" to authenticate');
          return;
        }
        
        console.log('\n🔐 Authenticated Providers:\n');
        
        for (const { provider, type } of authenticated) {
          const icon = provider === 'github' ? '🐙' : 
                      provider === 'anthropic' ? '🤖' :
                      provider === 'openai' ? '🧠' : '🔷';
          console.log(`  ${icon} ${provider.padEnd(12)} (${type})`);
        }
        
        console.log('');
        
      } catch (error: any) {
        logger.error('Failed to list providers', error);
        process.exit(1);
      }
    });
  
  return cmd;
}

/**
 * Auth command group
 */
export function createAuthCommand(): Command {
  const cmd = new Command('auth');
  
  cmd
    .description('Manage authentication')
    .addCommand(createAuthListCommand());
  
  return cmd;
}
