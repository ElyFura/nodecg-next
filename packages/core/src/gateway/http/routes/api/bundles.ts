/**
 * Bundle API Routes
 * REST endpoints for managing bundles
 */

import { FastifyInstance } from 'fastify';
import { getBundleManager } from '../../../../server/websocket';
import { authenticateToken, requireOperator } from '../../middleware/auth';
import { createLogger } from '../../../../utils/logger';

const logger = createLogger({ level: 'info' });

export async function bundleRoutes(fastify: FastifyInstance): Promise<void> {
  // Get all bundles
  fastify.get(
    '/',
    {
      preHandler: [authenticateToken],
    },
    async (_request, reply) => {
      try {
        const bundleManager = getBundleManager();
        if (!bundleManager) {
          reply.code(503).send({ error: 'Bundle Manager not available' });
          return;
        }

        const bundles = bundleManager.getAll();
        reply.send({ bundles });
      } catch (error) {
        logger.error('Failed to get bundles:', error);
        reply.code(500).send({ error: 'Failed to get bundles' });
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
        const bundleManager = getBundleManager();
        if (!bundleManager) {
          reply.code(503).send({ error: 'Bundle Manager not available' });
          return;
        }

        const { name } = request.params;
        const bundle = bundleManager.get(name);

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

  // Enable bundle
  fastify.post<{ Params: { name: string } }>(
    '/:name/enable',
    {
      preHandler: [authenticateToken, requireOperator],
    },
    async (request, reply) => {
      try {
        const bundleManager = getBundleManager();
        if (!bundleManager) {
          reply.code(503).send({ error: 'Bundle Manager not available' });
          return;
        }

        const { name } = request.params;
        await bundleManager.enable(name);

        const bundle = bundleManager.get(name);
        reply.send({ bundle });
      } catch (error) {
        logger.error('Failed to enable bundle:', error);
        reply.code(500).send({
          error: error instanceof Error ? error.message : 'Failed to enable bundle',
        });
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
        const bundleManager = getBundleManager();
        if (!bundleManager) {
          reply.code(503).send({ error: 'Bundle Manager not available' });
          return;
        }

        const { name } = request.params;
        await bundleManager.disable(name);

        reply.send({ success: true });
      } catch (error) {
        logger.error('Failed to disable bundle:', error);
        reply.code(500).send({
          error: error instanceof Error ? error.message : 'Failed to disable bundle',
        });
      }
    }
  );

  // Reload bundle
  fastify.post<{ Params: { name: string } }>(
    '/:name/reload',
    {
      preHandler: [authenticateToken, requireOperator],
    },
    async (request, reply) => {
      try {
        const bundleManager = getBundleManager();
        if (!bundleManager) {
          reply.code(503).send({ error: 'Bundle Manager not available' });
          return;
        }

        const { name } = request.params;
        const bundle = await bundleManager.reload(name);

        reply.send({ bundle });
      } catch (error) {
        logger.error('Failed to reload bundle:', error);
        reply.code(500).send({
          error: error instanceof Error ? error.message : 'Failed to reload bundle',
        });
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
        const bundleManager = getBundleManager();
        if (!bundleManager) {
          reply.code(503).send({ error: 'Bundle Manager not available' });
          return;
        }

        const stats = await bundleManager.getStatistics();
        reply.send({ stats });
      } catch (error) {
        logger.error('Failed to get bundle statistics:', error);
        reply.code(500).send({ error: 'Failed to get bundle statistics' });
      }
    }
  );

  // Get dependency tree
  fastify.get(
    '/dependencies',
    {
      preHandler: [authenticateToken],
    },
    async (_request, reply) => {
      try {
        const bundleManager = getBundleManager();
        if (!bundleManager) {
          reply.code(503).send({ error: 'Bundle Manager not available' });
          return;
        }

        const tree = await bundleManager.getDependencyTree();
        reply.send({ dependencies: tree });
      } catch (error) {
        logger.error('Failed to get dependency tree:', error);
        reply.code(500).send({ error: 'Failed to get dependency tree' });
      }
    }
  );

  // Force rediscover bundles
  fastify.post(
    '/discover',
    {
      preHandler: [authenticateToken, requireOperator],
    },
    async (_request, reply) => {
      try {
        const bundleManager = getBundleManager();
        if (!bundleManager) {
          reply.code(503).send({ error: 'Bundle Manager not available' });
          return;
        }

        const discovery = await bundleManager.discoverBundles();
        reply.send({ discovery });
      } catch (error) {
        logger.error('Failed to discover bundles:', error);
        reply.code(500).send({ error: 'Failed to discover bundles' });
      }
    }
  );
}
