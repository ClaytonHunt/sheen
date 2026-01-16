import { fileTools, readFileTool, writeFileTool, listFilesTool, editFileTool, searchFilesTool } from '../../src/tools/file';
import { ToolContext, AgentConfig, ProjectContext } from '../../src/utils/types';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('File Tools', () => {
  let context: ToolContext;
  let testDir: string;

  beforeEach(async () => {
    // Create temp test directory
    testDir = path.join(process.cwd(), 'test-file-' + Date.now());
    await fs.mkdir(testDir, { recursive: true });

    context = {
      workingDir: testDir,
      config: {
        maxIterations: 10,
        sleepBetweenIterations: 0,
        autoCommit: false,
        autoApprove: true,
        logLevel: 'error',
        opencode: { streamOutput: false, contextWindow: 200000 },
        tools: ['file'],
        excludePatterns: ['node_modules', '.git', 'dist'],
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

  describe('readFileTool', () => {
    it('should read file contents', async () => {
      await fs.writeFile(path.join(testDir, 'test.txt'), 'Hello World');
      const result = await readFileTool.execute({ path: 'test.txt' }, context);
      
      expect(result.success).toBe(true);
      expect(result.output).toBe('Hello World');
    });

    it('should fail for non-existent file', async () => {
      const result = await readFileTool.execute({ path: 'missing.txt' }, context);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to read file');
    });

    it('should handle subdirectories', async () => {
      await fs.mkdir(path.join(testDir, 'subdir'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'subdir', 'file.txt'), 'content');
      
      const result = await readFileTool.execute({ path: 'subdir/file.txt' }, context);
      
      expect(result.success).toBe(true);
      expect(result.output).toBe('content');
    });
  });

  describe('writeFileTool', () => {
    it('should write file contents', async () => {
      const result = await writeFileTool.execute(
        { path: 'test.txt', content: 'Hello World' },
        context
      );
      
      expect(result.success).toBe(true);
      expect(result.filesChanged).toHaveLength(1);
      
      const content = await fs.readFile(path.join(testDir, 'test.txt'), 'utf-8');
      expect(content).toBe('Hello World');
    });

    it('should create directories if needed', async () => {
      const result = await writeFileTool.execute(
        { path: 'subdir/test.txt', content: 'content' },
        context
      );
      
      expect(result.success).toBe(true);
      const content = await fs.readFile(path.join(testDir, 'subdir', 'test.txt'), 'utf-8');
      expect(content).toBe('content');
    });

    it('should overwrite existing file', async () => {
      await fs.writeFile(path.join(testDir, 'test.txt'), 'original');
      
      const result = await writeFileTool.execute(
        { path: 'test.txt', content: 'updated' },
        context
      );
      
      expect(result.success).toBe(true);
      const content = await fs.readFile(path.join(testDir, 'test.txt'), 'utf-8');
      expect(content).toBe('updated');
    });
  });

  describe('listFilesTool', () => {
    it('should list files in directory', async () => {
      await fs.writeFile(path.join(testDir, 'file1.txt'), 'content1');
      await fs.writeFile(path.join(testDir, 'file2.txt'), 'content2');
      
      const result = await listFilesTool.execute({ path: '.' }, context);
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('file1.txt');
      expect(result.output).toContain('file2.txt');
    });

    it('should list files recursively', async () => {
      await fs.mkdir(path.join(testDir, 'subdir'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'file1.txt'), 'content1');
      await fs.writeFile(path.join(testDir, 'subdir', 'file2.txt'), 'content2');
      
      const result = await listFilesTool.execute({ path: '.', recursive: true }, context);
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('file1.txt');
      // Use platform-specific path separator
      const expectedPath = path.join('subdir', 'file2.txt');
      expect(result.output).toContain(expectedPath);
    });

    it('should exclude patterns', async () => {
      await fs.mkdir(path.join(testDir, 'node_modules'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'file.txt'), 'content');
      await fs.writeFile(path.join(testDir, 'node_modules', 'package.json'), '{}');
      
      const result = await listFilesTool.execute({ path: '.', recursive: true }, context);
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('file.txt');
      expect(result.output).not.toContain('node_modules');
    });
  });

  describe('editFileTool', () => {
    it('should edit file with search/replace', async () => {
      await fs.writeFile(path.join(testDir, 'test.txt'), 'Hello World');
      
      const result = await editFileTool.execute(
        { path: 'test.txt', search: 'World', replace: 'Universe' },
        context
      );
      
      expect(result.success).toBe(true);
      expect(result.filesChanged).toHaveLength(1);
      
      const content = await fs.readFile(path.join(testDir, 'test.txt'), 'utf-8');
      expect(content).toBe('Hello Universe');
    });

    it('should fail if search text not found', async () => {
      await fs.writeFile(path.join(testDir, 'test.txt'), 'Hello World');
      
      const result = await editFileTool.execute(
        { path: 'test.txt', search: 'NotFound', replace: 'Something' },
        context
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Search text not found');
    });

    it('should handle multiple occurrences', async () => {
      await fs.writeFile(path.join(testDir, 'test.txt'), 'foo bar foo');
      
      const result = await editFileTool.execute(
        { path: 'test.txt', search: 'foo', replace: 'baz' },
        context
      );
      
      expect(result.success).toBe(true);
      const content = await fs.readFile(path.join(testDir, 'test.txt'), 'utf-8');
      expect(content).toBe('baz bar foo'); // Only first occurrence
    });
  });

  describe('searchFilesTool', () => {
    it('should search for pattern in files', async () => {
      await fs.writeFile(path.join(testDir, 'file1.txt'), 'Hello World');
      await fs.writeFile(path.join(testDir, 'file2.txt'), 'Goodbye World');
      
      const result = await searchFilesTool.execute({ pattern: 'World' }, context);
      
      expect(result.success).toBe(true);
      const output = result.output as any[];
      expect(output).toHaveLength(2);
      expect(output.some(r => r.file === 'file1.txt')).toBe(true);
      expect(output.some(r => r.file === 'file2.txt')).toBe(true);
    });

    it('should filter by file pattern', async () => {
      await fs.writeFile(path.join(testDir, 'test.txt'), 'Hello');
      await fs.writeFile(path.join(testDir, 'test.js'), 'Hello');
      
      const result = await searchFilesTool.execute(
        { pattern: 'Hello', filePattern: '*.txt' },
        context
      );
      
      expect(result.success).toBe(true);
      const output = result.output as any[];
      expect(output).toHaveLength(1);
      expect(output[0].file).toBe('test.txt');
    });

    it('should return line numbers', async () => {
      await fs.writeFile(path.join(testDir, 'test.txt'), 'line1\nHello\nline3');
      
      const result = await searchFilesTool.execute({ pattern: 'Hello' }, context);
      
      expect(result.success).toBe(true);
      const output = result.output as any[];
      expect(output[0].line).toBe(2);
    });
  });

  describe('fileTools array', () => {
    it('should export all file tools', () => {
      expect(fileTools).toHaveLength(5);
      expect(fileTools.map(t => t.name)).toEqual([
        'read_file',
        'write_file',
        'list_files',
        'edit_file',
        'search_files'
      ]);
    });
  });
});
