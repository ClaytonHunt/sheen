import { Command } from 'commander';
import { Logger } from './utils/logger';
import { ProjectDetector } from './project/detector';
import { SheenInitializer } from './project/initializer';
import { GlobalConfig } from './config/global';
import { Agent } from './core/agent';
import { showVersion } from './io/banner';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Check if .sheen/plan.md exists
 */
async function checkPlanExists(cwd: string): Promise<boolean> {
  const planPath = path.join(cwd, '.sheen', 'plan.md');
  try {
    await fs.access(planPath);
    return true;
  } catch {
    return false;
  }
}

export async function runCLI() {
  // Check for version flag before Commander processes it
  if (process.argv.includes('--version') || process.argv.includes('-V')) {
    showVersion('0.1.1');
    process.exit(0);
  }

  const program = new Command();

  program
    .name('sheen')
    .description('Autonomous coding agent with human oversight')
    .version('0.1.1');

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
      
      logger.debug('CLI started', { prompt, options });
      logger.debug(`Working directory: ${process.cwd()}`);
      logger.info('🚀 Sheen starting...');
      
      try {
        // Detect project
        logger.info('📂 Detecting project...');
        logger.debug('Initializing ProjectDetector');
        const detector = new ProjectDetector();
        const projectContext = await detector.detect(process.cwd());
        logger.debug(`Project context: ${JSON.stringify({ type: projectContext.type, framework: projectContext.framework })}`);
        logger.info(`✓ Detected: ${projectContext.type} project`);
        if (projectContext.framework) {
          logger.info(`  Framework: ${projectContext.framework}`);
        }
        
        // Initialize or load .sheen/
        logger.debug('Checking for .sheen/ directory');
        const initializer = new SheenInitializer(projectContext);
        if (!await initializer.exists()) {
          logger.info('📋 Initializing .sheen/ directory...');
          logger.debug(`Initializing with prompt: ${prompt || 'none'}`);
          await initializer.initialize(prompt);
          logger.info('✓ Created .sheen/ directory');
        } else {
          logger.info('✓ Found existing .sheen/ directory');
        }
        
        // Load configuration
        logger.debug('Loading global configuration');
        const globalConfig = await GlobalConfig.load();
        logger.debug(`Global config loaded: ${JSON.stringify(globalConfig)}`);
        const config = GlobalConfig.merge(
          {
            maxIterations: parseInt(options.maxIterations),
            autoApprove: options.approveAll,
            logLevel: options.verbose ? 'debug' : 'info'
          },
          undefined,
          globalConfig
        );
        logger.debug(`Merged config: maxIterations=${config.maxIterations}, logLevel=${config.logLevel}`);
        
        logger.info(`⚙️  Configuration loaded (max iterations: ${config.maxIterations})`);
        
        // Handle auto mode detection if no prompt provided
        let effectivePrompt = prompt;
        let isAutoMode = options.auto || options.continue;
        
        logger.debug(`Auto mode check: prompt=${!!prompt}, isAutoMode=${isAutoMode}`);
        
        if (!prompt && !isAutoMode) {
          // Check if plan exists for auto mode
          logger.debug('Checking for existing plan.md');
          const planExists = await checkPlanExists(process.cwd());
          logger.debug(`Plan exists: ${planExists}`);
          
          if (planExists) {
            logger.info('📝 No prompt provided, entering auto mode');
            logger.info('💡 Tip: Use --auto to skip this message next time');
            isAutoMode = true;
          } else {
            logger.info('📝 No prompt or plan found');
            logger.info('');
            logger.info('💡 Get started:');
            logger.info('   Initialize: sheen init');
            logger.info('   Or provide a prompt: sheen "your task here"');
            return;
          }
        }
        
        // Create agent
        logger.debug('Initializing Agent');
        const agent = new Agent(config, projectContext);
        
        // Run agent
        if (isAutoMode) {
          logger.info('📋 Loading plan from .sheen/plan.md...');
          
          // Load existing plan
          const planner = agent.getPlanner();
          const tasks = await planner.loadPlan();
          
          if (tasks.length === 0) {
            logger.warn('⚠️  No tasks found in plan');
            logger.info('💡 Add a task: sheen "your task here"');
            return;
          }
          
          const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
          logger.info(`✓ Found ${tasks.length} task(s) (${pendingTasks.length} pending)`);
          logger.info('🤖 Starting agent in auto mode...');
          logger.info('');
          
          const state = await agent.run(); // No prompt = auto mode
          
          logger.info('');
          logger.info('✅ Agent execution complete');
          logger.info(`   Iterations: ${state.iteration}`);
          logger.info(`   Files modified: ${state.metrics.fileCount}`);
          
        } else if (effectivePrompt) {
          logger.info('🤖 Starting agent...');
          logger.info(`📝 Prompt: "${effectivePrompt}"`);
          logger.info('');
          
          const state = await agent.run(effectivePrompt);
          
          logger.info('');
          logger.info('✅ Agent execution complete');
          logger.info(`   Iterations: ${state.iteration}`);
          logger.info(`   Files modified: ${state.metrics.fileCount}`);
        }
        
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
