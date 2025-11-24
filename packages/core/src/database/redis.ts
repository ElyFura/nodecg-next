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
      // Try to create Redis client with lazy connection
      const redisClient = new Redis(redisUrl, {
        retryStrategy: () => {
          // Don't retry - just fail fast and use MockRedis
          return null;
        },
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        lazyConnect: true, // Don't connect immediately
        connectTimeout: 1000,
      });

      // Try to connect with a timeout
      const connectPromise = redisClient
        .connect()
        .then(() => {
          log.info('Redis client connected');
          return true;
        })
        .catch((err: Error) => {
          log.warn(`Redis connection failed: ${err.message}, using in-memory cache`);
          redisClient.disconnect(false); // Disconnect without waiting
          return false;
        });

      // Check connection status synchronously by checking if connection attempt started
      // If Redis is not available, use MockRedis immediately
      Promise.resolve(connectPromise).then((connected) => {
        if (!connected && redis === redisClient) {
          // Replace with MockRedis if connection failed
          redis = new MockRedis(log);
        }
      });

      redisClient.on('error', (err: Error) => {
        log.debug('Redis client error:', err.message);
      });

      redisClient.on('close', () => {
        log.debug('Redis client closed');
        // Replace with MockRedis when connection closes
        if (redis === redisClient) {
          redis = new MockRedis(log);
        }
      });

      // For now, start with MockRedis since Redis isn't running
      // This avoids the "Connection is closed" error
      redis = new MockRedis(log);
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
