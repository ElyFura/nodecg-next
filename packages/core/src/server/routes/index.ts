/**
 * Route registration for Fastify
 */

import { FastifyInstance } from 'fastify';
import { NodeCGConfig } from '@nodecg/types';
import { healthRoutes } from './health';

export async function registerRoutes(
  fastify: FastifyInstance,
  _config: NodeCGConfig
): Promise<void> {
  // Health check routes
  await fastify.register(healthRoutes);

  // API routes will be added here
  // await fastify.register(apiRoutes, { prefix: '/api' });

  fastify.log.info('Routes registered');
}
