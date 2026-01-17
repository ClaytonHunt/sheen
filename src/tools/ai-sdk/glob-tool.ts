import { tool } from 'ai';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { ToolContext } from './types.js';

/**
 * Glob tool - File pattern matching
 */
export const globTool = tool({
  description: 'Find files matching a pattern (like glob or find)',
  parameters: z.object({
    pattern: z.string().describe('File pattern (e.g., "**/*.ts", "src/**/*.tsx", "*.json")'),
    path: z.string().optional().describe('Directory path to search (defaults to ".")'),
    maxResults: z.number().optional().describe('Maximum number of results to return (default: 100)')
  }),
  // @ts-expect-error - AI SDK v6 tool types have compatibility issues with TypeScript strict mode
  execute: async ({ pattern, path: searchPath = '.', maxResults = 100 }: {
    pattern: string;
    path?: string;
    maxResults?: number;
  }, context: ToolContext) => {
    const dirPath = path.resolve(context.workingDirectory, searchPath);
    
    try {
      // Get all files recursively
      const allFiles = await listFilesRecursive(dirPath, context.excludePatterns || []);
      
      // Filter by pattern
      const matchedFiles = allFiles.filter(file => matchGlobPattern(file, pattern));
      
      if (matchedFiles.length === 0) {
        return {
          success: true,
          message: `No files found matching pattern: ${pattern}`,
          files: []
        };
      }
      
      // Limit results
      const limitedFiles = matchedFiles.slice(0, maxResults);
      const truncated = matchedFiles.length > maxResults;
      
      return {
        success: true,
        message: `Found ${matchedFiles.length} files${truncated ? ` (showing first ${maxResults})` : ''}`,
        files: limitedFiles,
        totalCount: matchedFiles.length
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
 * Helper: Match file against glob pattern
 */
function matchGlobPattern(filePath: string, pattern: string): boolean {
  // Convert glob pattern to regex
  // ** = match any number of directories
  // * = match anything except directory separator
  
  let regexPattern = pattern
    .replace(/\*\*/g, '§§') // Temporarily replace **
    .replace(/\*/g, '[^/\\\\]*') // * matches anything except path separators
    .replace(/§§/g, '.*') // ** matches anything including path separators
    .replace(/\./g, '\\.') // Escape dots
    .replace(/\?/g, '.'); // ? matches single character
  
  // Handle {ext1,ext2} syntax
  if (regexPattern.includes('{') && regexPattern.includes('}')) {
    regexPattern = regexPattern.replace(/\{(.+?)\}/g, (_, group) => {
      const options = group.split(',').map((s: string) => s.trim()).join('|');
      return `(${options})`;
    });
  }
  
  const regex = new RegExp('^' + regexPattern + '$', 'i');
  
  // Test against both forward and backward slashes for Windows compatibility
  const normalizedPath = filePath.replace(/\\/g, '/');
  return regex.test(normalizedPath) || regex.test(filePath);
}
