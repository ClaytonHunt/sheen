import { Command } from 'commander';
import { Logger } from './utils/logger';
import { ProjectDetector } from './project/detector';
import { SheenInitializer } from './project/initializer';
import { GlobalConfig } from './config/global';

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
      const logger = new Logger(options.verbose ? 'debug' : 'info');
      
      logger.info('🚀 Sheen starting...');
      
      try {
        // Detect project
        logger.info('📂 Detecting project...');
        const detector = new ProjectDetector();
        const projectContext = await detector.detect(process.cwd());
        logger.info(`✓ Detected: ${projectContext.type} project`);
        if (projectContext.framework) {
          logger.info(`  Framework: ${projectContext.framework}`);
        }
        
        // Initialize or load .sheen/
        const initializer = new SheenInitializer(projectContext);
        if (!await initializer.exists()) {
          logger.info('📋 Initializing .sheen/ directory...');
          await initializer.initialize(prompt);
          logger.info('✓ Created .sheen/ directory');
        } else {
          logger.info('✓ Found existing .sheen/ directory');
        }
        
        // Load configuration
        const globalConfig = await GlobalConfig.load();
        const config = GlobalConfig.merge(
          {
            maxIterations: parseInt(options.maxIterations),
            autoApprove: options.approveAll,
            logLevel: options.verbose ? 'debug' : 'info'
          },
          undefined,
          globalConfig
        );
        
        logger.info(`⚙️  Configuration loaded (max iterations: ${config.maxIterations})`);
        
        // TODO: Run agent loop
        logger.warn('⏳ Agent execution not yet implemented');
        logger.info('📝 Ready for implementation!');
        
      } catch (error) {
        logger.error('❌ Error', error as Error);
        process.exit(1);
      }
    });

  // Init command
  program
    .command('init')
    .description('Initialize .sheen/ directory')
    .option('[prompt]', 'Initial prompt for the project')
    .action(async (promptArg) => {
      const logger = new Logger('info');
      
      try {
        logger.info('📂 Detecting project...');
        const detector = new ProjectDetector();
        const projectContext = await detector.detect(process.cwd());
        logger.info(`✓ Detected: ${projectContext.type} project`);
        
        const initializer = new SheenInitializer(projectContext);
        
        if (await initializer.exists()) {
          logger.warn('⚠️  .sheen/ directory already exists');
          return;
        }
        
        logger.info('📋 Initializing .sheen/ directory...');
        await initializer.initialize(promptArg || 'Project improvements');
        logger.info('✓ Created .sheen/ directory');
        logger.info('  - plan.md');
        logger.info('  - context.md');
        logger.info('  - config.json');
        logger.info('  - history.jsonl');
        logger.info('🎉 Ready to use sheen!');
        
      } catch (error) {
        logger.error('❌ Error', error as Error);
        process.exit(1);
      }
    });

  await program.parseAsync(process.argv);
}
