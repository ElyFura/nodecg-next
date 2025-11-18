/**
 * NodeCG Next - Main entry point
 */

import { NodeCGConfig } from '@nodecg/types';
import { NodeCGServerImpl } from './server';
import { createLogger } from './utils/logger';

// Default configuration
const defaultConfig: NodeCGConfig = {
  host: process.env.HOST || '0.0.0.0',
  port: parseInt(process.env.PORT || '3000', 10),
  baseURL: process.env.BASE_URL,
  logging: {
    level: (process.env.LOG_LEVEL as any) || 'info',
  },
};

export async function createServer(config?: Partial<NodeCGConfig>) {
  const finalConfig: NodeCGConfig = {
    ...defaultConfig,
    ...config,
    logging: {
      ...defaultConfig.logging,
      ...config?.logging,
    },
  };

  return new NodeCGServerImpl(finalConfig);
}

export { NodeCGServerImpl } from './server';
export { createLogger } from './utils/logger';

// Export types
export * from '@nodecg/types';

// If running directly, start the server
if (require.main === module) {
  const logger = createLogger();

  createServer()
    .then(async (server) => {
      await server.start();
    })
    .catch((error) => {
      logger.fatal('Failed to start NodeCG Next:', error);
      process.exit(1);
    });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
  });
}
