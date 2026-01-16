import * as fs from 'fs/promises';
import * as path from 'path';
import { Tool, ToolResult, ToolContext } from '../utils/types.js';

/**
 * Read file tool
 */
export const readFileTool: Tool = {
  name: 'read_file',
  description: 'Read contents of a file',
  category: 'file',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'File path (relative to working directory)',
      required: true
    }
  ],
  async execute(params: Record<string, any>, context: ToolContext): Promise<ToolResult> {
    const filePath = path.resolve(context.workingDir, params.path);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return {
        success: true,
        output: content
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to read file: ${errorMessage}`
      };
    }
  }
};

/**
 * Write file tool
 */
export const writeFileTool: Tool = {
  name: 'write_file',
  description: 'Write content to a file (creates file if it does not exist)',
  category: 'file',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'File path (relative to working directory)',
      required: true
    },
    {
      name: 'content',
      type: 'string',
      description: 'Content to write',
      required: true
    }
  ],
  async execute(params: Record<string, any>, context: ToolContext): Promise<ToolResult> {
    const filePath = path.resolve(context.workingDir, params.path);
    
    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      
      // Write file
      await fs.writeFile(filePath, params.content, 'utf-8');
      
      return {
        success: true,
        output: `File written: ${filePath}`,
        filesChanged: [filePath]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to write file: ${errorMessage}`
      };
    }
  }
};

/**
 * List files tool
 */
export const listFilesTool: Tool = {
  name: 'list_files',
  description: 'List files and directories in a directory',
  category: 'file',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'Directory path (relative to working directory, defaults to ".")',
      required: false,
      default: '.'
    },
    {
      name: 'recursive',
      type: 'boolean',
      description: 'List files recursively',
      required: false,
      default: false
    }
  ],
  async execute(params: Record<string, any>, context: ToolContext): Promise<ToolResult> {
    const dirPath = path.resolve(context.workingDir, params.path || '.');
    const recursive = params.recursive || false;
    
    try {
      const files = await listFilesRecursive(dirPath, recursive, context.config.excludePatterns);
      
      return {
        success: true,
        output: files
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to list files: ${errorMessage}`
      };
    }
  }
};

/**
 * Edit file tool (search and replace)
 */
export const editFileTool: Tool = {
  name: 'edit_file',
  description: 'Edit a file by searching for text and replacing it',
  category: 'file',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'File path (relative to working directory)',
      required: true
    },
    {
      name: 'search',
      type: 'string',
      description: 'Text to search for',
      required: true
    },
    {
      name: 'replace',
      type: 'string',
      description: 'Text to replace with',
      required: true
    }
  ],
  async execute(params: Record<string, any>, context: ToolContext): Promise<ToolResult> {
    const filePath = path.resolve(context.workingDir, params.path);
    
    try {
      // Read file
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Check if search text exists
      if (!content.includes(params.search)) {
        return {
          success: false,
          error: `Search text not found in file`
        };
      }
      
      // Replace text
      const newContent = content.replace(params.search, params.replace);
      
      // Write back
      await fs.writeFile(filePath, newContent, 'utf-8');
      
      return {
        success: true,
        output: `File edited: ${filePath}`,
        filesChanged: [filePath]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to edit file: ${errorMessage}`
      };
    }
  }
};

/**
 * Search files tool (grep)
 */
export const searchFilesTool: Tool = {
  name: 'search_files',
  description: 'Search for text pattern in files',
  category: 'file',
  parameters: [
    {
      name: 'pattern',
      type: 'string',
      description: 'Search pattern (regular expression)',
      required: true
    },
    {
      name: 'path',
      type: 'string',
      description: 'Directory path (relative to working directory, defaults to ".")',
      required: false,
      default: '.'
    },
    {
      name: 'filePattern',
      type: 'string',
      description: 'File pattern to filter (e.g., "*.ts")',
      required: false
    }
  ],
  async execute(params: Record<string, any>, context: ToolContext): Promise<ToolResult> {
    const dirPath = path.resolve(context.workingDir, params.path || '.');
    
    try {
      const regex = new RegExp(params.pattern, 'i');
      const results: { file: string; line: number; text: string }[] = [];
      
      // Get all files
      const files = await listFilesRecursive(dirPath, true, context.config.excludePatterns);
      
      // Filter by file pattern if provided
      const filteredFiles = params.filePattern
        ? files.filter(f => matchPattern(f, params.filePattern))
        : files;
      
      // Search in each file
      for (const file of filteredFiles) {
        const filePath = path.join(dirPath, file);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const lines = content.split('\n');
          
          lines.forEach((line, index) => {
            if (regex.test(line)) {
              results.push({
                file,
                line: index + 1,
                text: line.trim()
              });
            }
          });
        } catch (error) {
          // Skip files that can't be read
        }
      }
      
      return {
        success: true,
        output: results
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to search files: ${errorMessage}`
      };
    }
  }
};

/**
 * Helper: List files recursively
 */
async function listFilesRecursive(
  dirPath: string,
  recursive: boolean,
  excludePatterns: string[]
): Promise<string[]> {
  const results: string[] = [];
  
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(dirPath, fullPath);
    
    // Skip excluded patterns
    if (shouldExclude(relativePath, excludePatterns)) {
      continue;
    }
    
    if (entry.isDirectory()) {
      if (recursive) {
        const subFiles = await listFilesRecursive(fullPath, recursive, excludePatterns);
        results.push(...subFiles.map(f => path.join(entry.name, f)));
      } else {
        results.push(entry.name + '/');
      }
    } else {
      results.push(entry.name);
    }
  }
  
  return results.sort();
}

/**
 * Helper: Check if path should be excluded
 */
function shouldExclude(filePath: string, excludePatterns: string[]): boolean {
  return excludePatterns.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(filePath);
    }
    return filePath.includes(pattern);
  });
}

/**
 * Helper: Match file against pattern
 */
function matchPattern(filePath: string, pattern: string): boolean {
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  return regex.test(path.basename(filePath));
}

/**
 * All file tools
 */
export const fileTools: Tool[] = [
  readFileTool,
  writeFileTool,
  listFilesTool,
  editFileTool,
  searchFilesTool
];
