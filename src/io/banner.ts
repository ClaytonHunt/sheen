import chalk from 'chalk';

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
  console.log(chalk.cyan(BANNER));
  console.log(chalk.bold(`v${version}`) + chalk.gray(' - Autonomous coding agent'));
  console.log('');
}

/**
 * Display just the banner without version
 */
export function showBanner(): void {
  console.log(chalk.cyan(BANNER));
}
