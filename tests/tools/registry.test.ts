import { ToolRegistry } from '../../src/tools/registry';
import { Tool, ToolContext, AgentConfig, ProjectContext } from '../../src/utils/types';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;
  let context: ToolContext;
  let mockTool: Tool;

  beforeEach(() => {
    registry = new ToolRegistry();
    
    context = {
      workingDir: process.cwd(),
      config: {
        maxIterations: 10,
        sleepBetweenIterations: 0,
        autoCommit: false,
        autoApprove: true,
        logLevel: 'error',
        opencode: { streamOutput: false, contextWindow: 200000 },
        tools: [],
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

    mockTool = {
      name: 'test_tool',
      description: 'A test tool',
      category: 'file',
      parameters: [
        { name: 'param1', type: 'string', description: 'Test param', required: true }
      ],
      async execute(params, ctx) {
        return { success: true, output: `Executed with ${params.param1}` };
      }
    };
  });

  describe('register', () => {
    it('should register a tool', () => {
      registry.register(mockTool);
      expect(registry.has('test_tool')).toBe(true);
    });

    it('should overwrite existing tool with warning', () => {
      registry.register(mockTool);
      registry.register({ ...mockTool, description: 'Updated' });
      
      const tool = registry.get('test_tool');
      expect(tool?.description).toBe('Updated');
    });
  });

  describe('registerAll', () => {
    it('should register multiple tools', () => {
      const tools: Tool[] = [
        mockTool,
        { ...mockTool, name: 'test_tool2' }
      ];
      
      registry.registerAll(tools);
      
      expect(registry.count()).toBe(2);
      expect(registry.has('test_tool')).toBe(true);
      expect(registry.has('test_tool2')).toBe(true);
    });
  });

  describe('get', () => {
    it('should get registered tool', () => {
      registry.register(mockTool);
      const tool = registry.get('test_tool');
      
      expect(tool).toBeDefined();
      expect(tool?.name).toBe('test_tool');
    });

    it('should return undefined for non-existent tool', () => {
      const tool = registry.get('nonexistent');
      expect(tool).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all tools', () => {
      registry.register(mockTool);
      registry.register({ ...mockTool, name: 'test_tool2' });
      
      const tools = registry.getAll();
      expect(tools).toHaveLength(2);
    });

    it('should return empty array when no tools', () => {
      const tools = registry.getAll();
      expect(tools).toHaveLength(0);
    });
  });

  describe('getByCategory', () => {
    it('should return tools by category', () => {
      registry.register(mockTool);
      registry.register({ ...mockTool, name: 'git_tool', category: 'git' });
      
      const fileTools = registry.getByCategory('file');
      expect(fileTools).toHaveLength(1);
      expect(fileTools[0].name).toBe('test_tool');
    });
  });

  describe('has', () => {
    it('should return true for existing tool', () => {
      registry.register(mockTool);
      expect(registry.has('test_tool')).toBe(true);
    });

    it('should return false for non-existent tool', () => {
      expect(registry.has('nonexistent')).toBe(false);
    });
  });

  describe('execute', () => {
    it('should execute tool successfully', async () => {
      registry.register(mockTool);
      
      const result = await registry.execute(
        'test_tool',
        { param1: 'value1' },
        context
      );
      
      expect(result.success).toBe(true);
      expect(result.output).toBe('Executed with value1');
    });

    it('should fail for non-existent tool', async () => {
      const result = await registry.execute(
        'nonexistent',
        {},
        context
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Tool \'nonexistent\' not found');
    });

    it('should validate required parameters', async () => {
      registry.register(mockTool);
      
      const result = await registry.execute(
        'test_tool',
        {},
        context
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required parameter: param1');
    });

    it('should validate parameter types', async () => {
      registry.register(mockTool);
      
      const result = await registry.execute(
        'test_tool',
        { param1: 123 },
        context
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('should be string, got number');
    });

    it('should handle tool execution errors', async () => {
      const errorTool: Tool = {
        ...mockTool,
        name: 'error_tool',
        async execute() {
          throw new Error('Tool execution failed');
        }
      };
      
      registry.register(errorTool);
      
      const result = await registry.execute('error_tool', { param1: 'test' }, context);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Tool execution failed');
    });
  });

  describe('count', () => {
    it('should return tool count', () => {
      expect(registry.count()).toBe(0);
      
      registry.register(mockTool);
      expect(registry.count()).toBe(1);
      
      registry.register({ ...mockTool, name: 'test_tool2' });
      expect(registry.count()).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear all tools', () => {
      registry.register(mockTool);
      registry.register({ ...mockTool, name: 'test_tool2' });
      
      expect(registry.count()).toBe(2);
      
      registry.clear();
      expect(registry.count()).toBe(0);
    });
  });

  describe('getToolNames', () => {
    it('should return tool names', () => {
      registry.register(mockTool);
      registry.register({ ...mockTool, name: 'test_tool2' });
      
      const names = registry.getToolNames();
      expect(names).toContain('test_tool');
      expect(names).toContain('test_tool2');
    });
  });

  describe('generateDocs', () => {
    it('should generate tool documentation', () => {
      registry.register(mockTool);
      
      const docs = registry.generateDocs();
      
      expect(docs).toContain('# Available Tools');
      expect(docs).toContain('test_tool');
      expect(docs).toContain('A test tool');
      expect(docs).toContain('param1');
    });

    it('should group tools by category', () => {
      registry.register(mockTool);
      registry.register({ ...mockTool, name: 'git_tool', category: 'git' });
      
      const docs = registry.generateDocs();
      
      expect(docs).toContain('## FILE');
      expect(docs).toContain('## GIT');
    });
  });
});
