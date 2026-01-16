// Global Configuration Manager
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { AgentConfig } from '../utils/types';

export class GlobalConfig {
  private static readonly CONFIG_DIR = path.join(os.homedir(), '.sheen');
  private static readonly CONFIG_PATH = path.join(GlobalConfig.CONFIG_DIR, 'config.json');

  /**
   * Load global config from ~/.sheen/config.json
   */
  static async load(): Promise<Partial<AgentConfig>> {
    try {
      await fs.access(GlobalConfig.CONFIG_PATH);
      const content = await fs.readFile(GlobalConfig.CONFIG_PATH, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // Config doesn't exist or can't be read, return empty
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
      logLevel: 'info',
      opencode: {
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
   * Merge configs with priority: CLI > project > global > defaults
   */
  static merge(
    cli?: Partial<AgentConfig>,
    project?: Partial<AgentConfig>,
    global?: Partial<AgentConfig>
  ): AgentConfig {
    const defaults = GlobalConfig.getDefaults();
    
    return {
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
  }
}
