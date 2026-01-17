import { tool } from 'ai';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { ToolContext } from './types.js';

/**
 * Grep tool - Search for text patterns in files
 */
export const grepTool = tool({
  description: 'Search for text pattern in files (like grep)',
  parameters: z.object({
    pattern: z.string().describe('Search pattern (regular expression)'),
    path: z.string().optional().describe('Directory path (relative to working directory, defaults to ".")'),
    filePattern: z.string().optional().describe('File pattern to filter (e.g., "*.ts", "*.{ts,tsx}")')
  }),
  // @ts-expect-error - AI SDK v6 tool types have compatibility issues with TypeScript strict mode
  execute: async ({ pattern, path: searchPath = '.', filePattern }: {
    pattern: string;
    path?: string;
    filePattern?: string;
  }, context: ToolContext) => {
    const dirPath = path.resolve(context.workingDirectory, searchPath);
    
    try {
      const regex = new RegExp(pattern, 'i');
      const results: { file: string; line: number; text: string }[] = [];
      
      // Get all files recursively
      const files = await listFilesRecursive(dirPath, context.excludePatterns || []);
      
      // Filter by file pattern if provided
      const filteredFiles = filePattern
        ? files.filter(f => matchPattern(f, filePattern))
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
          // Skip files that can't be read (binary, permission denied, etc.)
        }
      }
      
      if (results.length === 0) {
        return {
          success: true,
          message: `No matches found for pattern: ${pattern}`,
          matches: []
        };
      }
      
      // Limit results to avoid overwhelming output
      const limitedResults = results.slice(0, 100);
      const truncated = results.length > 100;
      
      return {
        success: true,
        message: `Found ${results.length} matches${truncated ? ' (showing first 100)' : ''}`,
        matches: limitedResults,
        totalMatches: results.length
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});

/**
 * Helper: List files recursively
 */
async function listFilesRecursive(
  dirPath: string,
  excludePatterns: string[]
): Promise<string[]> {
  const results: string[] = [];
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(dirPath, fullPath);
      
      // Skip excluded patterns
      if (shouldExclude(relativePath, excludePatterns)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        const subFiles = await listFilesRecursive(fullPath, excludePatterns);
        results.push(...subFiles.map(f => path.join(entry.name, f)));
      } else {
        results.push(entry.name);
      }
    }
  } catch (error) {
    // Skip directories that can't be read
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
  // Handle multiple extensions like "*.{ts,tsx}"
  if (pattern.includes('{') && pattern.includes('}')) {
    const match = pattern.match(/\{(.+?)\}/);
    if (match) {
      const extensions = match[1].split(',');
      const basename = path.basename(filePath);
      return extensions.some(ext => basename.endsWith('.' + ext.trim()));
    }
  }
  
  // Simple glob pattern
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  return regex.test(path.basename(filePath));
}
