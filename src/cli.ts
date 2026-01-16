import { Command } from 'commander';
import { Logger } from './utils/logger';

const logger = new Logger('info');

export async function runCLI() {
  const program = new Command();

  program
    .name('sheen')
    .description('Autonomous coding agent with human oversight')
    .version('0.1.0');

  // Main command with prompt
  program
    .argument('[prompt]', 'Task prompt for the agent')
    .option('-a, --auto', 'Auto-resume from .sheen/plan.md')
    .option('-c, --continue', 'Continue previous session')
    .option('--approve-all', 'Skip all confirmations')
    .option('--max-iterations <number>', 'Maximum iterations', '100')
    .option('-v, --verbose', 'Verbose output')
    .option('--config <path>', 'Custom config file')
    .action(async (prompt, options) => {
      logger.info('Sheen starting...');
      logger.info(`Prompt: ${prompt || '(auto-resume mode)'}`);
      logger.info(`Options: ${JSON.stringify(options)}`);
      
      // TODO: Implement full agent execution
      logger.warn('Full implementation coming soon!');
    });

  // Init command
  program
    .command('init')
    .description('Initialize .sheen/ directory')
    .action(async () => {
      logger.info('Initializing .sheen/ directory...');
      // TODO: Implement initialization
      logger.warn('Implementation coming soon!');
    });

  await program.parseAsync(process.argv);
}
