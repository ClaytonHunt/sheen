// Global Configuration Manager
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { AgentConfig } from '../utils/types';
import { logger } from '../utils/logger';

export class GlobalConfig {
  private static readonly CONFIG_DIR = path.join(os.homedir(), '.sheen');
  private static readonly CONFIG_PATH = path.join(GlobalConfig.CONFIG_DIR, 'config.json');

  /**
   * Load global configuration
   */
  static async load(): Promise<Partial<AgentConfig>> {
    logger.debug(`Loading global config from ${GlobalConfig.CONFIG_PATH}`);
    
    try {
      const configPath = GlobalConfig.CONFIG_PATH;
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);
      logger.debug('Global config loaded successfully', config);
      return config;
    } catch (error) {
      logger.debug('No global config found, using defaults');
      return {};
    }
  }

  /**
   * Save global config to ~/.sheen/config.json
   */
  static async save(config: Partial<AgentConfig>): Promise<void> {
    await fs.mkdir(GlobalConfig.CONFIG_DIR, { recursive: true });
    const content = JSON.stringify(config, null, 2);
    await fs.writeFile(GlobalConfig.CONFIG_PATH, content, 'utf-8');
  }

  /**
   * Get default configuration
   */
  static getDefaults(): AgentConfig {
    return {
      maxIterations: 100,
      sleepBetweenIterations: 5,
      autoCommit: true,
      autoApprove: false,
      logLevel: 'debug', // Default to verbose (debug) mode like sheen.sh
      opencode: {
        model: 'github-copilot/claude-sonnet-4.5',
        streamOutput: true,
        contextWindow: 200000
      },
      tools: ['file', 'git', 'shell'],
      excludePatterns: ['node_modules', '.git', 'dist', 'build', 'coverage'],
      phaseTimeouts: {
        discovery: 5,
        planning: 10,
        implementation: 70,
        validation: 10
      },
      errorRecovery: {
        maxOpenCodeErrors: 3,
        maxTestRetries: 3,
        maxNoProgress: 5
      }
    };
  }

  /**
   * Merge configurations (CLI > project > global > defaults)
   */
  static merge(
    cli?: Partial<AgentConfig>,
    project?: Partial<AgentConfig>,
    global?: Partial<AgentConfig>
  ): AgentConfig {
    logger.debug('Merging configs: CLI > Project > Global > Defaults');
    
    const defaults = GlobalConfig.getDefaults();
    const merged = {
      ...defaults,
      ...global,
      ...project,
      ...cli,
      // Deep merge for nested objects
      opencode: {
        ...defaults.opencode,
        ...global?.opencode,
        ...project?.opencode,
        ...cli?.opencode
      },
      phaseTimeouts: {
        ...defaults.phaseTimeouts,
        ...global?.phaseTimeouts,
        ...project?.phaseTimeouts,
        ...cli?.phaseTimeouts
      },
      errorRecovery: {
        ...defaults.errorRecovery,
        ...global?.errorRecovery,
        ...project?.errorRecovery,
        ...cli?.errorRecovery
      }
    };
    
    logger.debug('Config merge complete', {
      maxIterations: merged.maxIterations,
      logLevel: merged.logLevel,
      autoApprove: merged.autoApprove
    });
    
    return merged;
  }
}
