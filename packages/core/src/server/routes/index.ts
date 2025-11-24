/**
 * Route registration for Fastify
 */

import { FastifyInstance } from 'fastify';
import { NodeCGConfig } from '@nodecg/types';
import { healthRoutes } from './health';
import { apiRoutes } from '../../gateway/http/routes/api';
import { dashboardRoutes } from '../../gateway/http/routes/dashboard';

export async function registerRoutes(
  fastify: FastifyInstance,
  _config: NodeCGConfig
): Promise<void> {
  // Health check routes
  await fastify.register(healthRoutes);

  // API routes
  await fastify.register(apiRoutes, { prefix: '/api' });

  // Dashboard routes (must be last to not override other routes)
  await fastify.register(dashboardRoutes);

  fastify.log.info('Routes registered');
}
