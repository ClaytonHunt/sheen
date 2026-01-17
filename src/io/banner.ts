import chalk from 'chalk';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Get the version from package.json
 */
export function getVersion(): string {
  try {
    // Read package.json from project root (two levels up from dist/io/)
    const packageJsonPath = join(__dirname, '..', '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version || '0.0.0';
  } catch (error) {
    // Fallback if package.json can't be read
    return '0.0.0';
  }
}

/**
 * ASCII art banner for Sheen
 * Generated using: http://patorjk.com/software/taag/ (ANSI Shadow font)
 */
export const BANNER = `
   _____ __                  
  / ___// /_  ___  ___  ____ 
  \\__ \\/ __ \\/ _ \\/ _ \\/ __ \\
 ___/ / / / /  __/  __/ / / /
/____/_/ /_/\\___/\\___/_/ /_/ 
`;

/**
 * Display version information with banner
 * @param version - Version string (e.g., "0.1.0")
 */
export function showVersion(version: string): void {
  console.log(chalk.magenta(BANNER));
  console.log(chalk.bold(`v${version}`) + chalk.gray(' - Autonomous coding agent'));
  console.log('');
}

/**
 * Display just the banner without version
 */
export function showBanner(): void {
  console.log(chalk.magenta(BANNER));
}
