// Logger utility
import * as fs from 'fs/promises';
import * as path from 'path';
import { LogEntry } from './types';
import chalk from 'chalk';

export class Logger {
  constructor(
    private logLevel: string = 'info',
    private historyFile?: string
  ) {}

  debug(message: string, meta?: any): void {
    if (this.shouldLog('debug')) {
      console.log(chalk.gray(`[DEBUG] ${message}`), meta || '');
    }
  }

  info(message: string, meta?: any): void {
    if (this.shouldLog('info')) {
      console.log(chalk.cyan(`[INFO]`) + ` ${message}`, meta || '');
    }
  }

  warn(message: string, meta?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(chalk.yellow(`[WARNING]`) + ` ${message}`, meta || '');
    }
  }

  error(message: string, error?: Error): void {
    if (this.shouldLog('error')) {
      console.error(chalk.red(`[ERROR]`) + ` ${message}`, error || '');
    }
  }
  
  success(message: string, meta?: any): void {
    if (this.shouldLog('info')) {
      console.log(chalk.green(`[SUCCESS]`) + ` ${message}`, meta || '');
    }
  }
  
  phase(message: string, meta?: any): void {
    if (this.shouldLog('info')) {
      console.log(chalk.magenta(`[PHASE]`) + ` ${message}`, meta || '');
    }
  }
  
  metric(message: string, meta?: any): void {
    if (this.shouldLog('info')) {
      console.log(chalk.blue(`[METRIC]`) + ` ${message}`, meta || '');
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

// Default logger instance
export const logger = new Logger();
