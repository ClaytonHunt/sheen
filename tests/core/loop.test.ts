import { ExecutionLoop } from '../../src/core/loop';
import { AgentConfig, ExecutionState, Phase, ProjectContext } from '../../src/utils/types';

describe('ExecutionLoop', () => {
  let config: AgentConfig;
  let projectContext: ProjectContext;
  let initialState: ExecutionState;

  beforeEach(() => {
    config = {
      maxIterations: 5,
      sleepBetweenIterations: 0,
      autoCommit: false,
      autoApprove: true,
      logLevel: 'error',
      opencode: {
        streamOutput: false,
        contextWindow: 200000
      },
      tools: ['file'],
      excludePatterns: ['node_modules', '.git'],
      phaseTimeouts: {
        discovery: 300000,
        planning: 300000,
        implementation: 600000,
        validation: 300000
      },
      errorRecovery: {
        maxOpenCodeErrors: 3,
        maxTestRetries: 3,
        maxNoProgress: 5
      }
    };

    projectContext = {
      rootDir: process.cwd(),
      type: 'nodejs',
      structure: { directories: [], mainFiles: [], configFiles: [] },
      hasTests: false,
      hasDocker: false,
      conventions: {}
    };

    initialState = {
      iteration: 0,
      phase: 'implementation' as Phase,
      phaseIteration: 0,
      tasks: [],
      metrics: {
        testCount: 0,
        fileCount: 0,
        commitCount: 0,
        noProgressCount: 0
      },
      errors: [],
      startedAt: new Date(),
      lastActivityAt: new Date(),
      paused: false,
      userMessages: [],
      projectContext
    };
  });

  describe('constructor', () => {
    it('should create ExecutionLoop instance', () => {
      const loop = new ExecutionLoop(config);
      expect(loop).toBeInstanceOf(ExecutionLoop);
    });
  });

  describe('shouldContinue', () => {
    it('should return false when max iterations reached', () => {
      const loop = new ExecutionLoop(config);
      const state = { ...initialState, iteration: 5 };
      expect(loop.shouldContinue(state)).toBe(false);
    });

    it('should return false when paused', () => {
      const loop = new ExecutionLoop(config);
      const state = { ...initialState, paused: true };
      expect(loop.shouldContinue(state)).toBe(false);
    });

    it('should return false when phase is complete', () => {
      const loop = new ExecutionLoop(config);
      const state = { ...initialState, phase: 'complete' as Phase };
      expect(loop.shouldContinue(state)).toBe(false);
    });

    it('should return true when conditions not met', () => {
      const loop = new ExecutionLoop(config);
      const state = { ...initialState, iteration: 2 };
      expect(loop.shouldContinue(state)).toBe(true);
    });

    it('should return false when too many errors', () => {
      const loop = new ExecutionLoop(config);
      const state = {
        ...initialState,
        errors: [
          { iteration: 1, phase: 'implementation' as Phase, error: new Error('test'), recovered: false, timestamp: new Date() },
          { iteration: 2, phase: 'implementation' as Phase, error: new Error('test'), recovered: false, timestamp: new Date() },
          { iteration: 3, phase: 'implementation' as Phase, error: new Error('test'), recovered: false, timestamp: new Date() },
          { iteration: 4, phase: 'implementation' as Phase, error: new Error('test'), recovered: false, timestamp: new Date() }
        ]
      };
      expect(loop.shouldContinue(state)).toBe(false);
    });

    it('should return false when no progress for too long', () => {
      const loop = new ExecutionLoop(config);
      const state = { ...initialState, metrics: { ...initialState.metrics, noProgressCount: 6 } };
      expect(loop.shouldContinue(state)).toBe(false);
    });
  });

  describe('incrementIteration', () => {
    it('should increment iteration counter', () => {
      const loop = new ExecutionLoop(config);
      const state = { ...initialState };
      loop.incrementIteration(state);
      expect(state.iteration).toBe(1);
    });

    it('should update last activity time', () => {
      const loop = new ExecutionLoop(config);
      const state = { ...initialState };
      const before = state.lastActivityAt;
      setTimeout(() => {
        loop.incrementIteration(state);
        expect(state.lastActivityAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      }, 10);
    });
  });

  describe('detectProgress', () => {
    it('should detect progress when files changed', () => {
      const loop = new ExecutionLoop(config);
      const prevMetrics = { testCount: 0, fileCount: 5, commitCount: 0, noProgressCount: 0 };
      const currentMetrics = { testCount: 0, fileCount: 8, commitCount: 0, noProgressCount: 0 };
      expect(loop.detectProgress(prevMetrics, currentMetrics)).toBe(true);
    });

    it('should detect progress when commits made', () => {
      const loop = new ExecutionLoop(config);
      const prevMetrics = { testCount: 0, fileCount: 5, commitCount: 1, noProgressCount: 0 };
      const currentMetrics = { testCount: 0, fileCount: 5, commitCount: 2, noProgressCount: 0 };
      expect(loop.detectProgress(prevMetrics, currentMetrics)).toBe(true);
    });

    it('should detect no progress when nothing changed', () => {
      const loop = new ExecutionLoop(config);
      const prevMetrics = { testCount: 0, fileCount: 5, commitCount: 1, noProgressCount: 0 };
      const currentMetrics = { testCount: 0, fileCount: 5, commitCount: 1, noProgressCount: 0 };
      expect(loop.detectProgress(prevMetrics, currentMetrics)).toBe(false);
    });
  });
});
