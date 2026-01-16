#!/usr/bin/env node

import { runCLI } from './cli';
import { Logger } from './utils/logger';

const logger = new Logger('info');

// Handle uncaught errors
process.on('unhandledRejection', (error: Error) => {
  logger.error('Unhandled rejection', error);
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});

// Graceful shutdown
let shuttingDown = false;

async function gracefulShutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  
  logger.info('Sheen shutting down...');
  // TODO: Add cleanup logic (stop agent, save state, etc.)
  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Run CLI
runCLI().catch((error: Error) => {
  logger.error('Fatal error', error);
  process.exit(1);
});
