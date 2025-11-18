#!/usr/bin/env node
/**
 * NodeCG Next CLI
 * Command-line interface for starting and managing NodeCG Next server
 */

import { createServer } from './index';
import { createLogger } from './utils/logger';

const logger = createLogger();

async function main() {
  try {
    logger.info('Starting NodeCG Next...');

    // Create and start server
    const server = await createServer();
    await server.start();

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      try {
        await server.stop();
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.fatal('Failed to start NodeCG Next:', error);
    process.exit(1);
  }
}

// Run the CLI
main();
