/**
 * Redis client setup
 */

import Redis from 'ioredis';
import { Logger } from '@nodecg/types';
import { createLogger } from '../utils/logger';

let redis: Redis | undefined;
const logger = createLogger({ level: 'info' });

export function getRedisClient(customLogger?: Logger): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    redis = new Redis(redisUrl, {
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    const log = customLogger || logger;

    redis.on('connect', () => {
      log.info('Redis client connected');
    });

    redis.on('ready', () => {
      log.info('Redis client ready');
    });

    redis.on('error', (err: Error) => {
      log.error('Redis client error:', err);
    });

    redis.on('close', () => {
      log.info('Redis client closed');
    });

    redis.on('reconnecting', () => {
      log.warn('Redis client reconnecting...');
    });
  }

  return redis;
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = undefined;
  }
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await disconnectRedis();
});
