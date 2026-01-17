/**
 * Gitignore Filter
 * 
 * Respects .gitignore patterns for file operations.
 * Prevents tools from accessing or modifying ignored files.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export class GitignoreFilter {
  private patterns: RegExp[] = [];
  private ignoreFiles: string[] = [];
  private cached: boolean = false;

  /**
   * Load .gitignore patterns from project directory
   */
  async load(projectRoot: string): Promise<void> {
    const gitignorePath = path.join(projectRoot, '.gitignore');
    
    try {
      const content = await fs.readFile(gitignorePath, 'utf-8');
      this.parseGitignore(content);
      this.cached = true;
      
      console.log(`[GITIGNORE] Loaded ${this.patterns.length} patterns from .gitignore`);
    } catch (error) {
      // No .gitignore file, use default patterns
      this.useDefaultPatterns();
      this.cached = true;
    }
  }

  /**
   * Parse .gitignore content and convert to regex patterns
   */
  private parseGitignore(content: string): void {
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      
      // Negation patterns (!) are not fully supported yet
      if (trimmed.startsWith('!')) {
        console.warn(`[GITIGNORE] Negation patterns not fully supported: ${trimmed}`);
        continue;
      }
      
      // Convert gitignore pattern to regex
      const pattern = this.gitignoreToRegex(trimmed);
      this.patterns.push(pattern);
      
      // Track specific filenames for quick lookup
      if (!trimmed.includes('*') && !trimmed.includes('/')) {
        this.ignoreFiles.push(trimmed);
      }
    }
  }

  /**
   * Convert .gitignore pattern to regex
   */
  private gitignoreToRegex(pattern: string): RegExp {
    let regexStr = pattern;
    
    // Escape special regex characters except * and ?
    regexStr = regexStr.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    
    // Handle directory patterns (trailing /)
    if (regexStr.endsWith('/')) {
      regexStr = regexStr.slice(0, -1) + '($|/)';
    }
    
    // Handle leading /
    if (regexStr.startsWith('/')) {
      regexStr = '^' + regexStr.slice(1);
    } else {
      // Pattern can match at any level
      regexStr = '(^|/)' + regexStr;
    }
    
    // Convert * to match anything except /
    regexStr = regexStr.replace(/\\\*/g, '[^/]*');
    
    // Convert ** to match anything including /
    regexStr = regexStr.replace(/\[\^\/\]\*\[\^\/\]\*/g, '.*');
    
    // Ensure end of string or directory
    if (!regexStr.endsWith('($|/)') && !regexStr.endsWith('.*')) {
      regexStr = regexStr + '($|/)';
    }
    
    return new RegExp(regexStr);
  }

  /**
   * Use default ignore patterns if no .gitignore exists
   */
  private useDefaultPatterns(): void {
    const defaults = [
      'node_modules',
      '.git',
      '.env',
      '.env.local',
      'dist',
      'build',
      '*.log',
      '.DS_Store',
      'Thumbs.db'
    ];
    
    for (const pattern of defaults) {
      this.patterns.push(this.gitignoreToRegex(pattern));
    }
    
    console.log(`[GITIGNORE] Using ${defaults.length} default patterns`);
  }

  /**
   * Check if a path should be ignored
   */
  isIgnored(filePath: string): boolean {
    if (!this.cached) {
      console.warn('[GITIGNORE] Patterns not loaded, allowing by default');
      return false;
    }
    
    // Normalize path (use forward slashes)
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    // Quick check for exact filename matches
    const filename = path.basename(normalizedPath);
    if (this.ignoreFiles.includes(filename)) {
      return true;
    }
    
    // Check against all patterns
    for (const pattern of this.patterns) {
      if (pattern.test(normalizedPath)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Filter a list of paths, removing ignored ones
   */
  filter(paths: string[]): string[] {
    return paths.filter(p => !this.isIgnored(p));
  }

  /**
   * Check if path is safe for file operations
   */
  async checkPath(filePath: string, projectRoot: string): Promise<{ allowed: boolean; reason?: string }> {
    // Ensure patterns are loaded
    if (!this.cached) {
      await this.load(projectRoot);
    }
    
    // Get relative path from project root
    const relativePath = path.relative(projectRoot, filePath);
    
    // Don't allow operations outside project root
    if (relativePath.startsWith('..')) {
      return {
        allowed: false,
        reason: 'Path is outside project root'
      };
    }
    
    // Check if ignored
    if (this.isIgnored(relativePath)) {
      return {
        allowed: false,
        reason: 'Path matches .gitignore pattern'
      };
    }
    
    // Additional safety checks
    const sensitivePatterns = [
      /\.git\//,
      /\.env$/,
      /password/i,
      /secret/i,
      /private.*key/i,
      /\.ssh\//
    ];
    
    for (const pattern of sensitivePatterns) {
      if (pattern.test(relativePath)) {
        return {
          allowed: false,
          reason: 'Path contains sensitive data'
        };
      }
    }
    
    return { allowed: true };
  }

  /**
   * Get all loaded patterns (for debugging)
   */
  getPatterns(): RegExp[] {
    return [...this.patterns];
  }

  /**
   * Reset filter
   */
  reset(): void {
    this.patterns = [];
    this.ignoreFiles = [];
    this.cached = false;
  }
}
