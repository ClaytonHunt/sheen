import { shellTools, shellExecTool } from '../../src/tools/shell';
import { ToolContext, AgentConfig, ProjectContext } from '../../src/utils/types';

describe('Shell Tools', () => {
  let context: ToolContext;

  beforeEach(() => {
    context = {
      workingDir: process.cwd(),
      config: {
        maxIterations: 10,
        sleepBetweenIterations: 0,
        autoCommit: false,
        autoApprove: true,
        logLevel: 'error',
        opencode: { streamOutput: false, contextWindow: 200000 },
        tools: ['shell'],
        excludePatterns: [],
        phaseTimeouts: { discovery: 300000, planning: 300000, implementation: 600000, validation: 300000 },
        errorRecovery: { maxOpenCodeErrors: 3, maxTestRetries: 3, maxNoProgress: 5 }
      } as AgentConfig,
      projectContext: {
        rootDir: process.cwd(),
        type: 'nodejs',
        structure: { directories: [], mainFiles: [], configFiles: [] },
        hasTests: false,
        hasDocker: false,
        conventions: {}
      } as ProjectContext
    };
  });

  describe('shellExecTool', () => {
    it('should execute simple command', async () => {
      const result = await shellExecTool.execute(
        { command: 'echo "test"' },
        context
      );
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('test');
      expect(result.exitCode).toBe(0);
    });

    it('should handle command with output', async () => {
      const result = await shellExecTool.execute(
        { command: 'node --version' },
        context
      );
      
      expect(result.success).toBe(true);
      expect(result.output).toMatch(/v\d+\.\d+\.\d+/);
      expect(result.exitCode).toBe(0);
    });

    it('should fail on non-existent command', async () => {
      const result = await shellExecTool.execute(
        { command: 'nonexistentcommand123' },
        context
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should fail on command with non-zero exit code', async () => {
      const result = await shellExecTool.execute(
        { command: 'node -e "process.exit(1)"' },
        context
      );
      
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });

    it('should require command parameter', async () => {
      const result = await shellExecTool.execute({}, context);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Command is required');
    });

    it('should handle multi-line output', async () => {
      const result = await shellExecTool.execute(
        { command: 'echo "line1" && echo "line2"' },
        context
      );
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('line1');
      expect(result.output).toContain('line2');
    });
  });

  describe('shellTools array', () => {
    it('should export shell tools', () => {
      expect(shellTools).toHaveLength(1);
      expect(shellTools[0].name).toBe('shell_exec');
    });
  });
});
