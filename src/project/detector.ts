// Project Detector - Detects project type and context
import * as fs from 'fs/promises';
import * as path from 'path';
import { ProjectContext, ProjectType, PackageManager, ProjectStructure, GitInfo, ProjectConventions } from '../utils/types';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export class ProjectDetector {
  /**
   * Detect project type and context
   */
  async detect(directory: string): Promise<ProjectContext> {
    const type = await this.detectType(directory);
    const framework = await this.detectFramework(directory, type);
    const language = await this.detectLanguage(directory, type);
    const packageManager = await this.detectPackageManager(directory, type);
    const structure = await this.analyzeStructure(directory);
    const conventions = await this.detectConventions(directory);
    const git = await this.detectGit(directory);
    const hasTests = await this.hasTests(directory);
    const hasDocker = await this.exists(path.join(directory, 'Dockerfile'));

    return {
      rootDir: directory,
      type,
      framework,
      language,
      packageManager,
      structure,
      conventions,
      git,
      hasTests,
      hasDocker
    };
  }

  /**
   * Detect project type
   */
  private async detectType(dir: string): Promise<ProjectType> {
    logger.debug('Checking for package.json...');
    if (await this.exists(path.join(dir, 'package.json'))) {
      logger.debug('Found package.json, detected nodejs');
      return 'nodejs';
    }
    
    logger.debug('Checking for pyproject.toml...');
    if (await this.exists(path.join(dir, 'pyproject.toml')) || 
        await this.exists(path.join(dir, 'setup.py'))) {
      logger.debug('Found Python project files');
      return 'python';
    }
    
    logger.debug('Checking for go.mod...');
    if (await this.exists(path.join(dir, 'go.mod'))) {
      logger.debug('Found go.mod');
      return 'go';
    }
    
    logger.debug('Checking for Cargo.toml...');
    if (await this.exists(path.join(dir, 'Cargo.toml'))) {
      logger.debug('Found Cargo.toml');
      return 'rust';
    }
    
    logger.debug('No specific project type detected, using unknown');
    return 'unknown';
  }

  /**
   * Detect framework based on dependencies
   */
  private async detectFramework(dir: string, type: ProjectType): Promise<string | undefined> {
    if (type === 'nodejs') {
      try {
        const pkgPath = path.join(dir, 'package.json');
        const content = await fs.readFile(pkgPath, 'utf-8');
        const pkg = JSON.parse(content);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        
        if (deps.express) return 'express';
        if (deps.next) return 'nextjs';
        if (deps.react) return 'react';
        if (deps.vue) return 'vue';
        if (deps['@nestjs/core']) return 'nestjs';
      } catch {
        // Ignore parse errors
      }
    }
    
    if (type === 'python') {
      try {
        const reqPath = path.join(dir, 'requirements.txt');
        const content = await fs.readFile(reqPath, 'utf-8');
        
        if (content.includes('fastapi')) return 'fastapi';
        if (content.includes('django')) return 'django';
        if (content.includes('flask')) return 'flask';
      } catch {
        // Ignore read errors
      }
    }
    
    return undefined;
  }

  /**
   * Detect primary language
   */
  private async detectLanguage(dir: string, type: ProjectType): Promise<string | undefined> {
    if (type === 'nodejs') {
      if (await this.exists(path.join(dir, 'tsconfig.json'))) return 'typescript';
      return 'javascript';
    }
    if (type === 'python') return 'python';
    if (type === 'go') return 'go';
    if (type === 'rust') return 'rust';
    return undefined;
  }

  /**
   * Detect package manager
   */
  private async detectPackageManager(dir: string, type: ProjectType): Promise<PackageManager | undefined> {
    if (type === 'nodejs') {
      if (await this.exists(path.join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
      if (await this.exists(path.join(dir, 'yarn.lock'))) return 'yarn';
      if (await this.exists(path.join(dir, 'package-lock.json'))) return 'npm';
      return 'npm'; // Default for Node.js
    }
    if (type === 'python') {
      if (await this.exists(path.join(dir, 'poetry.lock'))) return 'poetry';
      return 'pip';
    }
    if (type === 'rust') return 'cargo';
    return undefined;
  }

  /**
   * Analyze directory structure
   */
  private async analyzeStructure(dir: string): Promise<ProjectStructure> {
    const directories: string[] = [];
    const mainFiles: string[] = [];
    const configFiles: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.name.startsWith('.') && entry.name !== '.github') continue;
        if (entry.name === 'node_modules') continue;
        
        if (entry.isDirectory()) {
          directories.push(entry.name);
        } else {
          // Check for main files
          if (['index.js', 'index.ts', 'main.py', 'main.go', 'main.rs'].includes(entry.name)) {
            mainFiles.push(entry.name);
          }
          // Check for config files
          if (entry.name.endsWith('.json') || entry.name.endsWith('.yaml') || entry.name.endsWith('.toml')) {
            configFiles.push(entry.name);
          }
        }
      }
    } catch {
      // Ignore errors
    }

    return { directories, mainFiles, configFiles };
  }

  /**
   * Detect conventions
   */
  private async detectConventions(dir: string): Promise<ProjectConventions> {
    const conventions: ProjectConventions = {};

    // Test framework
    if (await this.exists(path.join(dir, 'jest.config.js'))) conventions.testFramework = 'jest';
    if (await this.exists(path.join(dir, 'vitest.config.ts'))) conventions.testFramework = 'vitest';
    if (await this.exists(path.join(dir, 'pytest.ini'))) conventions.testFramework = 'pytest';

    // Linter
    if (await this.exists(path.join(dir, '.eslintrc.js'))) conventions.linter = 'eslint';
    if (await this.exists(path.join(dir, '.pylintrc'))) conventions.linter = 'pylint';

    // Formatter
    if (await this.exists(path.join(dir, '.prettierrc'))) conventions.formatter = 'prettier';
    if (await this.exists(path.join(dir, '.black'))) conventions.formatter = 'black';

    return conventions;
  }

  /**
   * Detect Git information
   */
  private async detectGit(dir: string): Promise<GitInfo> {
    // Check if .git directory exists
    const gitDir = path.join(dir, '.git');
    if (!await this.exists(gitDir)) {
      return {
        initialized: false,
        hasUncommittedChanges: false
      };
    }

    try {
      // Get current branch
      const { stdout: branch } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: dir });
      
      // Get remote
      let remote: string | undefined;
      try {
        const { stdout: remoteUrl } = await execAsync('git remote get-url origin', { cwd: dir });
        remote = remoteUrl.trim();
      } catch {
        // No remote configured
      }

      // Check for uncommitted changes
      const { stdout: status } = await execAsync('git status --porcelain', { cwd: dir });
      const hasUncommittedChanges = status.trim().length > 0;

      return {
        initialized: true,
        branch: branch.trim(),
        remote,
        hasUncommittedChanges
      };
    } catch {
      return {
        initialized: true,
        hasUncommittedChanges: false
      };
    }
  }

  /**
   * Check if project has tests
   */
  private async hasTests(dir: string): Promise<boolean> {
    const testDirs = ['test', 'tests', '__tests__', 'spec'];
    
    for (const testDir of testDirs) {
      if (await this.exists(path.join(dir, testDir))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if file/directory exists
   */
  private async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
