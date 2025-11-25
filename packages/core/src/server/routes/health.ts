/**
 * Health check routes
 * Enhanced with detailed system status checks for production readiness
 */

import { FastifyInstance } from 'fastify';
import { getPrismaClient } from '../../database/client';
import { getRedisClient } from '../../database/redis';

interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error';
  message?: string;
  latency?: number;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: HealthCheckResult;
    redis: HealthCheckResult;
    memory: HealthCheckResult;
  };
}

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  // Basic health check - fast check without dependencies
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '0.1.0',
    };
  });

  // Detailed health check - checks all dependencies
  fastify.get('/health/detailed', async (_request, reply) => {
    const checks: SystemHealth['checks'] = {
      database: await checkDatabase(),
      redis: await checkRedis(),
      memory: checkMemory(),
    };

    // Determine overall status
    let overallStatus: SystemHealth['status'] = 'healthy';
    const statuses = Object.values(checks).map((c) => c.status);

    if (statuses.includes('error')) {
      overallStatus = 'unhealthy';
      reply.code(503);
    } else if (statuses.includes('degraded')) {
      overallStatus = 'degraded';
      reply.code(200);
    }

    const health: SystemHealth = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    };

    return health;
  });

  // Readiness check (for Kubernetes) - checks if service is ready to accept traffic
  fastify.get('/ready', async (_request, reply) => {
    try {
      // Check critical dependencies
      const dbCheck = await checkDatabase();
      const redisCheck = await checkRedis();

      if (dbCheck.status === 'error' || redisCheck.status === 'error') {
        reply.code(503);
        return {
          status: 'not_ready',
          timestamp: new Date().toISOString(),
          reason: 'Critical dependencies not available',
          checks: {
            database: dbCheck,
            redis: redisCheck,
          },
        };
      }

      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
    } catch (error) {
      reply.code(503);
      return {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Liveness check (for Kubernetes) - checks if service is alive
  fastify.get('/live', async () => {
    // Simple check - if we can respond, we're alive
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  // Startup check (for Kubernetes) - checks if service has finished starting
  fastify.get('/startup', async (_request, reply) => {
    const minUptime = 5; // Minimum uptime in seconds

    if (process.uptime() < minUptime) {
      reply.code(503);
      return {
        status: 'starting',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        message: `Service is still starting (uptime: ${process.uptime().toFixed(2)}s)`,
      };
    }

    return {
      status: 'started',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<HealthCheckResult> {
  try {
    const startTime = Date.now();
    const prisma = getPrismaClient();

    // Simple query to check connection
    await prisma.$queryRaw`SELECT 1`;

    const latency = Date.now() - startTime;

    if (latency > 1000) {
      return {
        status: 'degraded',
        message: 'Database response time is slow',
        latency,
      };
    }

    return {
      status: 'ok',
      latency,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Database connection failed',
    };
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<HealthCheckResult> {
  try {
    const startTime = Date.now();
    const redis = getRedisClient();

    if (!redis) {
      return {
        status: 'degraded',
        message: 'Redis client not initialized',
      };
    }

    // Ping Redis
    if ('ping' in redis) { await redis.ping(); }

    const latency = Date.now() - startTime;

    if (latency > 500) {
      return {
        status: 'degraded',
        message: 'Redis response time is slow',
        latency,
      };
    }

    return {
      status: 'ok',
      latency,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Redis connection failed',
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): HealthCheckResult {
  const memUsage = process.memoryUsage();
  const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
  const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
  const heapPercent = (heapUsedMB / heapTotalMB) * 100;

  if (heapPercent > 90) {
    return {
      status: 'degraded',
      message: `High memory usage: ${heapPercent.toFixed(2)}%`,
    };
  }

  return {
    status: 'ok',
    message: `Memory usage: ${heapUsedMB.toFixed(2)}MB / ${heapTotalMB.toFixed(2)}MB (${heapPercent.toFixed(2)}%)`,
  };
}
