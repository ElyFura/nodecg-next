/**
 * Bundle API Routes
 * REST endpoints for managing bundles
 */

import { FastifyInstance } from 'fastify';
import { getRepositories } from '../../../../database/client';
import { authenticateToken, requireAdmin, requireOperator } from '../../middleware/auth';
import { createLogger } from '../../../../utils/logger';

const logger = createLogger({ level: 'info' });

export async function bundleRoutes(fastify: FastifyInstance): Promise<void> {
  const repos = getRepositories(logger);

  // Get all bundles
  fastify.get(
    '/',
    {
      preHandler: [authenticateToken],
    },
    async (_request, reply) => {
      try {
        const bundles = await repos.bundle.findMany();
        reply.send({ bundles });
      } catch (error) {
        logger.error('Failed to get bundles:', error);
        reply.code(500).send({ error: 'Failed to get bundles' });
      }
    }
  );

  // Get enabled bundles only
  fastify.get(
    '/enabled',
    {
      preHandler: [authenticateToken],
    },
    async (_request, reply) => {
      try {
        const bundles = await repos.bundle.findEnabled();
        reply.send({ bundles });
      } catch (error) {
        logger.error('Failed to get enabled bundles:', error);
        reply.code(500).send({ error: 'Failed to get enabled bundles' });
      }
    }
  );

  // Get specific bundle by name
  fastify.get<{ Params: { name: string } }>(
    '/:name',
    {
      preHandler: [authenticateToken],
    },
    async (request, reply) => {
      try {
        const { name } = request.params;
        const bundle = await repos.bundle.findByName(name);

        if (!bundle) {
          reply.code(404).send({ error: 'Bundle not found' });
          return;
        }

        reply.send({ bundle });
      } catch (error) {
        logger.error('Failed to get bundle:', error);
        reply.code(500).send({ error: 'Failed to get bundle' });
      }
    }
  );

  // Get bundle configuration
  fastify.get<{ Params: { name: string } }>(
    '/:name/config',
    {
      preHandler: [authenticateToken],
    },
    async (request, reply) => {
      try {
        const { name } = request.params;
        const config = await repos.bundle.getConfigByName(name);

        if (!config) {
          reply.code(404).send({ error: 'Bundle not found' });
          return;
        }

        reply.send({ config });
      } catch (error) {
        logger.error('Failed to get bundle config:', error);
        reply.code(500).send({ error: 'Failed to get bundle config' });
      }
    }
  );

  // Enable bundle
  fastify.post<{ Params: { name: string } }>(
    '/:name/enable',
    {
      preHandler: [authenticateToken, requireOperator],
    },
    async (request, reply) => {
      try {
        const { name } = request.params;
        const bundle = await repos.bundle.enableByName(name);
        reply.send({ bundle });
      } catch (error) {
        logger.error('Failed to enable bundle:', error);
        reply.code(500).send({ error: 'Failed to enable bundle' });
      }
    }
  );

  // Disable bundle
  fastify.post<{ Params: { name: string } }>(
    '/:name/disable',
    {
      preHandler: [authenticateToken, requireOperator],
    },
    async (request, reply) => {
      try {
        const { name } = request.params;
        const bundle = await repos.bundle.disableByName(name);
        reply.send({ bundle });
      } catch (error) {
        logger.error('Failed to disable bundle:', error);
        reply.code(500).send({ error: 'Failed to disable bundle' });
      }
    }
  );

  // Delete bundle
  fastify.delete<{ Params: { name: string } }>(
    '/:name',
    {
      preHandler: [authenticateToken, requireAdmin],
    },
    async (request, reply) => {
      try {
        const { name } = request.params;
        await repos.bundle.deleteByName(name);
        reply.send({ success: true });
      } catch (error) {
        logger.error('Failed to delete bundle:', error);
        reply.code(500).send({ error: 'Failed to delete bundle' });
      }
    }
  );

  // Get bundle statistics
  fastify.get(
    '/stats',
    {
      preHandler: [authenticateToken],
    },
    async (_request, reply) => {
      try {
        const stats = await repos.bundle.getStatistics();
        reply.send({ stats });
      } catch (error) {
        logger.error('Failed to get bundle statistics:', error);
        reply.code(500).send({ error: 'Failed to get bundle statistics' });
      }
    }
  );
}
