// Logger utility
import * as fs from 'fs/promises';
import * as path from 'path';
import { LogEntry } from './types';

export class Logger {
  constructor(
    private logLevel: string = 'info',
    private historyFile?: string
  ) {}

  debug(message: string, meta?: any): void {
    if (this.shouldLog('debug')) {
      console.log(`[DEBUG] ${message}`, meta || '');
    }
  }

  info(message: string, meta?: any): void {
    if (this.shouldLog('info')) {
      console.log(`[INFO] ${message}`, meta || '');
    }
  }

  warn(message: string, meta?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, meta || '');
    }
  }

  error(message: string, error?: Error): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, error || '');
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private async appendHistory(entry: LogEntry): Promise<void> {
    if (!this.historyFile) return;
    
    try {
      const line = JSON.stringify(entry) + '\n';
      await fs.appendFile(this.historyFile, line, 'utf-8');
    } catch (error) {
      // Silently fail for history logging
    }
  }
}
