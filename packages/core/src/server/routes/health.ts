/**
 * Health check routes
 */

import { FastifyInstance } from 'fastify';

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  // Basic health check
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  // Readiness check (for Kubernetes)
  fastify.get('/ready', async () => {
    // TODO: Check database connection, etc.
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  });

  // Liveness check (for Kubernetes)
  fastify.get('/live', async () => {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  });
}
