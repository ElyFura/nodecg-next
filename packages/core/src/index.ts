/**
 * NodeCG Next - Main Entry Point
 * Starts the NodeCG server with default configuration
 */

import { NodeCGServerImpl } from './server/index';
import { loadConfig } from './config/loader';
import { createLogger } from './utils/logger';

const logger = createLogger({ level: 'info' });

async function main() {
  try {
    // Load configuration
    const config = loadConfig();

    // Create and start server
    const server = new NodeCGServerImpl(config);
    await server.start();

    // Handle graceful shutdown
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

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start NodeCG server:', error);
    process.exit(1);
  }
}

// Start the server
main();
