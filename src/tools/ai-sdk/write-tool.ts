/**
 * Write Tool - AI SDK Format
 * 
 * Write content to a file (creates or overwrites)
 */

import { tool } from 'ai';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Write tool for file creation
 */
export const writeTool = tool({
  description: 'Write content to a file (creates or overwrites). Use this to create new files.',
  
  parameters: z.object({
    filePath: z.string().describe('Absolute path to the file'),
    content: z.string().describe('Content to write to the file'),
  }),
  
  // @ts-expect-error - AI SDK v6 tool types have compatibility issues with TypeScript strict mode
  execute: async ({ filePath, content }: {
    filePath: string;
    content: string;
  }) => {
    console.log(`[TOOL:write] ${filePath} (${content.length} bytes)`);
    
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      // Write file
      await fs.writeFile(filePath, content, 'utf-8');
      
      return {
        success: true,
        bytesWritten: content.length,
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
