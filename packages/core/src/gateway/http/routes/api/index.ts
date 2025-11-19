/**
 * API Routes Index
 * Registers all API route modules
 */

import { FastifyInstance } from 'fastify';
import { replicantRoutes } from './replicants';
import { bundleRoutes } from './bundles';
import { assetRoutes } from './assets';

export async function apiRoutes(fastify: FastifyInstance): Promise<void> {
  // Register all API routes with /api prefix
  await fastify.register(replicantRoutes, { prefix: '/replicants' });
  await fastify.register(bundleRoutes, { prefix: '/bundles' });
  await fastify.register(assetRoutes, { prefix: '/assets' });

  fastify.log.info('API routes registered');
}
