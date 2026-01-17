/**
 * Read Tool - AI SDK Format
 * 
 * Read file contents from the codebase
 */

import { tool } from 'ai';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Read tool for file reading
 */
export const readTool = tool({
  description: 'Read file contents from the codebase. Returns file content with line numbers.',
  
  parameters: z.object({
    filePath: z.string().describe('Absolute path to the file to read'),
    offset: z.number().optional().describe('Line number to start from (0-indexed)'),
    limit: z.number().optional().describe('Number of lines to read (default: 2000)'),
  }),
  
  // @ts-expect-error - AI SDK v6 tool types have compatibility issues with TypeScript strict mode
  execute: async ({ filePath, offset = 0, limit = 2000 }: {
    filePath: string;
    offset?: number;
    limit?: number;
  }) => {
    console.log(`[TOOL:read] ${filePath}${offset ? ` (from line ${offset})` : ''}`);
    
    try {
      // Read file
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      const selectedLines = lines.slice(offset, offset + limit);
      
      // Format with line numbers (like cat -n)
      const formatted = selectedLines
        .map((line, idx) => {
          const lineNum = offset + idx + 1;
          return `${String(lineNum).padStart(5, '0')}| ${line}`;
        })
        .join('\n');
      
      return {
        success: true,
        content: formatted,
        totalLines: lines.length,
        displayedLines: selectedLines.length,
        filePath,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        filePath,
      };
    }
  },
});
