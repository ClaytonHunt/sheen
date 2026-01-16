import { gitTools, gitStatusTool, gitCommitTool, gitDiffTool } from '../../src/tools/git';
import { ToolContext, AgentConfig, ProjectContext } from '../../src/utils/types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';

describe('Git Tools', () => {
  let context: ToolContext;
  let testDir: string;

  beforeEach(async () => {
    // Create temp test directory
    testDir = path.join(process.cwd(), 'test-git-' + Date.now());
    await fs.mkdir(testDir, { recursive: true });

    // Initialize git repo
    execSync('git init', { cwd: testDir });
    execSync('git config user.email "test@example.com"', { cwd: testDir });
    execSync('git config user.name "Test User"', { cwd: testDir });

    context = {
      workingDir: testDir,
      config: {
        maxIterations: 10,
        sleepBetweenIterations: 0,
        autoCommit: false,
        autoApprove: true,
        logLevel: 'error',
        opencode: { streamOutput: false, contextWindow: 200000 },
        tools: ['git'],
        excludePatterns: [],
        phaseTimeouts: { discovery: 300000, planning: 300000, implementation: 600000, validation: 300000 },
        errorRecovery: { maxOpenCodeErrors: 3, maxTestRetries: 3, maxNoProgress: 5 }
      } as AgentConfig,
      projectContext: {
        rootDir: testDir,
        type: 'nodejs',
        structure: { directories: [], mainFiles: [], configFiles: [] },
        hasTests: false,
        hasDocker: false,
        conventions: {}
      } as ProjectContext
    };
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('gitStatusTool', () => {
    it('should return clean status for empty repo', async () => {
      const result = await gitStatusTool.execute({}, context);
      expect(result.success).toBe(true);
      expect(result.output).toContain('nothing to commit');
    });

    it('should detect untracked files', async () => {
      await fs.writeFile(path.join(testDir, 'test.txt'), 'content');
      const result = await gitStatusTool.execute({}, context);
      expect(result.success).toBe(true);
      expect(result.output).toContain('test.txt');
    });

    it('should detect modified files', async () => {
      await fs.writeFile(path.join(testDir, 'test.txt'), 'content');
      execSync('git add test.txt && git commit -m "initial"', { cwd: testDir });
      await fs.writeFile(path.join(testDir, 'test.txt'), 'modified');
      const result = await gitStatusTool.execute({}, context);
      expect(result.success).toBe(true);
      expect(result.output).toContain('modified');
    });
  });

  describe('gitCommitTool', () => {
    it('should commit staged files', async () => {
      await fs.writeFile(path.join(testDir, 'test.txt'), 'content');
      execSync('git add test.txt', { cwd: testDir });
      
      const result = await gitCommitTool.execute(
        { message: 'test commit' },
        context
      );
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('test commit');
    });

    it('should fail with no staged files', async () => {
      const result = await gitCommitTool.execute(
        { message: 'test commit' },
        context
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should require commit message', async () => {
      await fs.writeFile(path.join(testDir, 'test.txt'), 'content');
      execSync('git add test.txt', { cwd: testDir });
      
      const result = await gitCommitTool.execute({}, context);
      
      expect(result.success).toBe(false);
    });
  });

  describe('gitDiffTool', () => {
    it('should return empty diff for clean repo', async () => {
      const result = await gitDiffTool.execute({}, context);
      expect(result.success).toBe(true);
      expect(result.output).toBe('');
    });

    it('should show diff for modified files', async () => {
      await fs.writeFile(path.join(testDir, 'test.txt'), 'original');
      execSync('git add test.txt && git commit -m "initial"', { cwd: testDir });
      await fs.writeFile(path.join(testDir, 'test.txt'), 'modified');
      
      const result = await gitDiffTool.execute({}, context);
      expect(result.success).toBe(true);
      expect(result.output).toContain('original');
      expect(result.output).toContain('modified');
    });

    it('should support staged flag', async () => {
      await fs.writeFile(path.join(testDir, 'test.txt'), 'original');
      execSync('git add test.txt && git commit -m "initial"', { cwd: testDir });
      await fs.writeFile(path.join(testDir, 'test.txt'), 'modified');
      execSync('git add test.txt', { cwd: testDir });
      
      const result = await gitDiffTool.execute({ staged: true }, context);
      expect(result.success).toBe(true);
      expect(result.output).toContain('modified');
    });
  });

  describe('gitTools array', () => {
    it('should export all git tools', () => {
      expect(gitTools).toHaveLength(3);
      expect(gitTools.map(t => t.name)).toEqual(['git_status', 'git_commit', 'git_diff']);
    });
  });
});
