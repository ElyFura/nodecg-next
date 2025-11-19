/**
 * Asset API Routes
 * REST endpoints for managing assets (files/media)
 */

import { FastifyInstance } from 'fastify';
import { getRepositories } from '../../../../database/client';
import { authenticateToken, requireOperator } from '../../middleware/auth';
import { createLogger } from '../../../../utils/logger';

const logger = createLogger({ level: 'info' });

export async function assetRoutes(fastify: FastifyInstance): Promise<void> {
  const repos = getRepositories(logger);

  // Get all namespaces
  fastify.get(
    '/namespaces',
    {
      preHandler: [authenticateToken],
    },
    async (_request, reply) => {
      try {
        const namespaces = await repos.asset.getNamespaces();
        reply.send({ namespaces });
      } catch (error) {
        logger.error('Failed to get asset namespaces:', error);
        reply.code(500).send({ error: 'Failed to get asset namespaces' });
      }
    }
  );

  // Get categories for namespace
  fastify.get<{ Params: { namespace: string } }>(
    '/:namespace/categories',
    {
      preHandler: [authenticateToken],
    },
    async (request, reply) => {
      try {
        const { namespace } = request.params;
        const categories = await repos.asset.getCategories(namespace);
        reply.send({ categories });
      } catch (error) {
        logger.error('Failed to get asset categories:', error);
        reply.code(500).send({ error: 'Failed to get asset categories' });
      }
    }
  );

  // Get all assets for namespace
  fastify.get<{ Params: { namespace: string } }>(
    '/:namespace',
    {
      preHandler: [authenticateToken],
    },
    async (request, reply) => {
      try {
        const { namespace } = request.params;
        const assets = await repos.asset.findByNamespace(namespace);
        reply.send({ assets });
      } catch (error) {
        logger.error('Failed to get assets:', error);
        reply.code(500).send({ error: 'Failed to get assets' });
      }
    }
  );

  // Get assets by namespace and category
  fastify.get<{ Params: { namespace: string; category: string } }>(
    '/:namespace/:category',
    {
      preHandler: [authenticateToken],
    },
    async (request, reply) => {
      try {
        const { namespace, category } = request.params;
        const assets = await repos.asset.findByNamespaceAndCategory(namespace, category);
        reply.send({ assets });
      } catch (error) {
        logger.error('Failed to get assets:', error);
        reply.code(500).send({ error: 'Failed to get assets' });
      }
    }
  );

  // Get specific asset
  fastify.get<{ Params: { namespace: string; category: string; name: string } }>(
    '/:namespace/:category/:name',
    {
      preHandler: [authenticateToken],
    },
    async (request, reply) => {
      try {
        const { namespace, category, name } = request.params;
        const asset = await repos.asset.findByNamespaceCategoryAndName(namespace, category, name);

        if (!asset) {
          reply.code(404).send({ error: 'Asset not found' });
          return;
        }

        reply.send({ asset });
      } catch (error) {
        logger.error('Failed to get asset:', error);
        reply.code(500).send({ error: 'Failed to get asset' });
      }
    }
  );

  // Delete asset
  fastify.delete<{ Params: { namespace: string; category: string; name: string } }>(
    '/:namespace/:category/:name',
    {
      preHandler: [authenticateToken, requireOperator],
    },
    async (request, reply) => {
      try {
        const { namespace, category, name } = request.params;
        await repos.asset.deleteByNamespaceCategoryAndName(namespace, category, name);
        reply.send({ success: true });
      } catch (error) {
        logger.error('Failed to delete asset:', error);
        reply.code(500).send({ error: 'Failed to delete asset' });
      }
    }
  );

  // Search assets by name
  fastify.get<{ Querystring: { q: string } }>(
    '/search',
    {
      preHandler: [authenticateToken],
    },
    async (request, reply) => {
      try {
        const { q } = request.query;

        if (!q || q.length < 2) {
          reply.code(400).send({ error: 'Query must be at least 2 characters' });
          return;
        }

        const assets = await repos.asset.searchByName(q);
        reply.send({ assets });
      } catch (error) {
        logger.error('Failed to search assets:', error);
        reply.code(500).send({ error: 'Failed to search assets' });
      }
    }
  );

  // Get asset statistics
  fastify.get(
    '/stats',
    {
      preHandler: [authenticateToken],
    },
    async (_request, reply) => {
      try {
        const stats = await repos.asset.getStatistics();
        reply.send({ stats });
      } catch (error) {
        logger.error('Failed to get asset statistics:', error);
        reply.code(500).send({ error: 'Failed to get asset statistics' });
      }
    }
  );

  // Get images only
  fastify.get(
    '/images',
    {
      preHandler: [authenticateToken],
    },
    async (_request, reply) => {
      try {
        const images = await repos.asset.findImages();
        reply.send({ images });
      } catch (error) {
        logger.error('Failed to get images:', error);
        reply.code(500).send({ error: 'Failed to get images' });
      }
    }
  );

  // Get videos only
  fastify.get(
    '/videos',
    {
      preHandler: [authenticateToken],
    },
    async (_request, reply) => {
      try {
        const videos = await repos.asset.findVideos();
        reply.send({ videos });
      } catch (error) {
        logger.error('Failed to get videos:', error);
        reply.code(500).send({ error: 'Failed to get videos' });
      }
    }
  );

  // Get audio only
  fastify.get(
    '/audio',
    {
      preHandler: [authenticateToken],
    },
    async (_request, reply) => {
      try {
        const audio = await repos.asset.findAudio();
        reply.send({ audio });
      } catch (error) {
        logger.error('Failed to get audio:', error);
        reply.code(500).send({ error: 'Failed to get audio' });
      }
    }
  );
}
