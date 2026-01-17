/**
 * Edit Tool - AI SDK Format
 * 
 * Edit a file by replacing exact string matches
 */

import { tool } from 'ai';
import { z } from 'zod';
import * as fs from 'fs/promises';

/**
 * Edit tool for file editing
 */
export const editTool = tool({
  description: 'Edit a file by replacing exact string matches. Preserves indentation and formatting.',
  
  parameters: z.object({
    filePath: z.string().describe('Absolute path to the file'),
    oldString: z.string().describe('Exact string to replace'),
    newString: z.string().describe('String to replace it with'),
    replaceAll: z.boolean().optional().describe('Replace all occurrences (default: false)'),
  }),
  
  // @ts-expect-error - AI SDK v6 tool types have compatibility issues with TypeScript strict mode
  execute: async ({ filePath, oldString, newString, replaceAll = false }: {
    filePath: string;
    oldString: string;
    newString: string;
    replaceAll?: boolean;
  }) => {
    console.log(`[TOOL:edit] ${filePath}`);
    
    try {
      // Read file
      let content = await fs.readFile(filePath, 'utf-8');
      
      // Count occurrences
      const occurrences = (content.match(new RegExp(escapeRegex(oldString), 'g')) || []).length;
      
      if (occurrences === 0) {
        return {
          success: false,
          error: 'oldString not found in content',
          filePath,
        };
      }
      
      if (occurrences > 1 && !replaceAll) {
        return {
          success: false,
          error: `oldString found ${occurrences} times. Use replaceAll: true to replace all occurrences.`,
          filePath,
          occurrences,
        };
      }
      
      // Perform replacement
      const newContent = replaceAll 
        ? replaceAllOccurrences(content, oldString, newString)
        : content.replace(oldString, newString);
      
      // Write file
      await fs.writeFile(filePath, newContent, 'utf-8');
      
      return {
        success: true,
        replacements: replaceAll ? occurrences : 1,
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

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Replace all occurrences of a string (using String.prototype.replaceAll polyfill)
 */
function replaceAllOccurrences(str: string, search: string, replace: string): string {
  return str.split(search).join(replace);
}
