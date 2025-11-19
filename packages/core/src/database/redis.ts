/**
 * Redis client setup with fallback to in-memory cache
 */

import Redis from 'ioredis';
import { Logger } from '@nodecg/types';
import { createLogger } from '../utils/logger';

let redis: Redis | MockRedis | undefined;
const logger = createLogger({ level: 'info' });

/**
 * Mock Redis client for development when Redis is not available
 */
class MockRedis {
  private cache = new Map<string, { value: string; expiry?: number }>();
  private log: Logger;

  constructor(log: Logger) {
    this.log = log;
    this.log.warn('Using in-memory cache (MockRedis) - Redis not available');
  }

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (entry.expiry && Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    this.cache.set(key, {
      value,
      expiry: Date.now() + seconds * 1000,
    });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (this.cache.delete(key)) {
        deleted++;
      }
    }
    return deleted;
  }

  async keys(pattern: string): Promise<string[]> {
    // Simple pattern matching (only supports * wildcard)
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.cache.keys()).filter((key) => regex.test(key));
  }

  async quit(): Promise<void> {
    this.cache.clear();
  }

  on(_event: string, _handler: (...args: unknown[]) => void): void {
    // No-op for mock
  }
}

export function getRedisClient(customLogger?: Logger): Redis | MockRedis {
  if (!redis) {
    const log = customLogger || logger;
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    try {
      redis = new Redis(redisUrl, {
        retryStrategy: (times: number) => {
          // Give up after 3 attempts and fall back to mock
          if (times > 3) {
            log.warn('Redis connection failed, falling back to in-memory cache');
            return null; // Stop retrying
          }
          const delay = Math.min(times * 50, 500);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
        connectTimeout: 2000,
      });

      redis.on('connect', () => {
        log.info('Redis client connected');
      });

      redis.on('ready', () => {
        log.info('Redis client ready');
      });

      redis.on('error', (err: Error) => {
        // Only log as debug to avoid spam
        log.debug('Redis client error:', err.message);

        // If connection fails, replace with mock
        if (err.message.includes('ECONNREFUSED') || err.message.includes('ETIMEDOUT')) {
          if (!(redis instanceof MockRedis)) {
            log.warn('Redis unavailable, switching to in-memory cache');
            redis = new MockRedis(log);
          }
        }
      });

      redis.on('close', () => {
        log.info('Redis client closed');
      });

      redis.on('reconnecting', () => {
        log.debug('Redis client reconnecting...');
      });
    } catch (error) {
      log.error('Failed to create Redis client:', error);
      redis = new MockRedis(log);
    }
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
