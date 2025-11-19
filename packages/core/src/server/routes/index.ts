/**
 * Route registration for Fastify
 */

import { FastifyInstance } from 'fastify';
import { NodeCGConfig } from '@nodecg/types';
import { healthRoutes } from './health';
import { apiRoutes } from '../../gateway/http/routes/api';
import { dashboardRoutes } from '../../gateway/http/routes/dashboard';
import { bundleContentRoutes } from '../../gateway/http/routes/bundle-content';

export async function registerRoutes(
  fastify: FastifyInstance,
  _config: NodeCGConfig
): Promise<void> {
  // Health check routes
  await fastify.register(healthRoutes);

  // API routes
  await fastify.register(apiRoutes, { prefix: '/api' });

  // Bundle content routes (dashboard panels, graphics)
  await fastify.register(bundleContentRoutes);

  // Dashboard routes (must be last to not override other routes)
  await fastify.register(dashboardRoutes);

  fastify.log.info('Routes registered');
}
