/**
 * Prisma database client setup
 */

import { PrismaClient } from './generated/client';
import { Logger } from '@nodecg/types';
import { Repositories, createRepositories } from './repositories';

let prisma: PrismaClient | undefined;
let repositories: Repositories | undefined;

export function getPrismaClient(logger?: Logger): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ],
    });

    // Log queries in development
    // Note: Using 'as never' cast because generated Prisma types vary based on schema
    if (process.env.NODE_ENV !== 'production' && logger) {
      prisma.$on('query' as never, (e: { query: string; duration: number }) => {
        logger.debug(`Query: ${e.query} - Duration: ${e.duration}ms`);
      });

      prisma.$on('error' as never, (e: { message: string }) => {
        logger.error(`Database error: ${e.message}`);
      });

      prisma.$on('warn' as never, (e: { message: string }) => {
        logger.warn(`Database warning: ${e.message}`);
      });
    }
  }

  return prisma;
}

export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = undefined;
    repositories = undefined;
  }
}

/**
 * Get repository container (singleton)
 * Provides access to all database repositories
 */
export function getRepositories(logger?: Logger): Repositories {
  const client = getPrismaClient(logger);

  if (!repositories) {
    repositories = createRepositories(client);
  }

  return repositories;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await disconnectPrisma();
});
