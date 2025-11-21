/**
 * API routes for NodeCG Next
 * Provides REST API endpoints for dashboard and external access
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
// import { requireAuth, optionalAuth } from '../middleware/auth.middleware';

export async function apiRoutes(fastify: FastifyInstance): Promise<void> {
  // TODO: Add authentication middleware for production
  // For development, API endpoints are public

  /**
   * GET /api/stats
   * Get dashboard statistics
   */
  fastify.get('/stats', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const bundleManager = (fastify as any).bundleManager;
      const bundleStats = bundleManager?.getStatistics?.();
      const bundles = bundleStats?.bundles || [];

      // Get replicant count from in-memory store
      const replicantService = (fastify as any).replicantService;
      let replicantCount = 0;
      if (replicantService) {
        // Access internal replicants map if available
        const replicants = (replicantService as any).replicants;
        if (replicants instanceof Map) {
          replicantCount = replicants.size;
        }
      }

      // Get user count from database
      const prisma = (fastify as any).prisma;
      let userCount = 0;
      if (prisma) {
        userCount = await prisma.user.count();
      }

      const stats = {
        bundles: bundles.length,
        replicants: replicantCount,
        users: userCount,
        status: 'online' as const,
        uptime: process.uptime(),
      };

      return reply.status(200).send(stats);
    } catch (error) {
      fastify.log.error(error, 'Error getting stats');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get statistics',
      });
    }
  });

  /**
   * GET /api/bundles
   * List all bundles
   */
  fastify.get('/bundles', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const bundleManager = (fastify as any).bundleManager;
      if (!bundleManager) {
        return reply.status(503).send({
          error: 'Service Unavailable',
          message: 'Bundle manager not initialized',
        });
      }

      // Get bundle data from BundleManager's internal map
      const bundlesMap = (bundleManager as any).bundles as Map<string, any>;
      const bundles = Array.from(bundlesMap.values());

      const bundleList = bundles.map((bundle: any) => ({
        name: bundle.config.name,
        version: bundle.config.version,
        description: bundle.config.description || '',
        authors: bundle.config.authors || [],
        homepage: bundle.config.homepage,
        license: bundle.config.license,
        git: bundle.config.git,
        status: 'loaded' as const,
        hasExtension: !!bundle.extension,
        hasDashboard: Array.isArray(bundle.config.dashboard) && bundle.config.dashboard.length > 0,
        hasGraphics: Array.isArray(bundle.config.graphics) && bundle.config.graphics.length > 0,
      }));

      return reply.status(200).send({ bundles: bundleList });
    } catch (error) {
      fastify.log.error(error, 'Error getting bundles');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get bundles',
      });
    }
  });

  /**
   * POST /api/bundles/reload
   * Reload all bundles
   */
  fastify.post('/bundles/reload', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const bundleManager = (fastify as any).bundleManager;
      if (!bundleManager) {
        return reply.status(503).send({
          error: 'Service Unavailable',
          message: 'Bundle manager not initialized',
        });
      }

      // Reload bundles by reinitializing the bundle manager
      await bundleManager.initialize?.();

      return reply.status(200).send({
        success: true,
        message: 'Bundles reloaded successfully',
      });
    } catch (error) {
      fastify.log.error(error, 'Error reloading bundles');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to reload bundles',
      });
    }
  });

  /**
   * GET /api/replicants
   * List all replicants
   */
  fastify.get('/replicants', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const prisma = (fastify as any).prisma;
      if (!prisma) {
        return reply.status(503).send({
          error: 'Service Unavailable',
          message: 'Database not initialized',
        });
      }

      // Get all replicants from database
      const dbReplicants = await prisma.replicant.findMany({
        orderBy: {
          updatedAt: 'desc',
        },
      });

      const replicants = dbReplicants.map((rep: any) => ({
        namespace: rep.namespace,
        name: rep.name,
        value: JSON.parse(rep.value),
        revision: rep.revision,
      }));

      return reply.status(200).send({ replicants });
    } catch (error) {
      fastify.log.error(error, 'Error getting replicants');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get replicants',
      });
    }
  });

  /**
   * DELETE /api/replicants/:namespace/:name
   * Delete a replicant
   */
  fastify.delete<{
    Params: { namespace: string; name: string };
  }>(
    '/replicants/:namespace/:name',
    async (
      request: FastifyRequest<{ Params: { namespace: string; name: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { namespace, name } = request.params;
        const replicantService = (fastify as any).replicantService;

        if (!replicantService) {
          return reply.status(503).send({
            error: 'Service Unavailable',
            message: 'Replicant service not initialized',
          });
        }

        // Delete replicant
        const replicantMap = (replicantService as any).replicants;
        if (replicantMap instanceof Map) {
          const key = `${namespace}:${name}`;
          replicantMap.delete(key);
        }

        return reply.status(200).send({
          success: true,
          message: `Replicant ${namespace}:${name} deleted successfully`,
        });
      } catch (error) {
        fastify.log.error(error, 'Error deleting replicant');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to delete replicant',
        });
      }
    }
  );

  /**
   * GET /api/users
   * List all users
   */
  fastify.get('/users', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const prisma = (fastify as any).prisma;
      if (!prisma) {
        return reply.status(503).send({
          error: 'Service Unavailable',
          message: 'Database not initialized',
        });
      }

      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
          updatedAt: true,
          role: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return reply.status(200).send({ users });
    } catch (error) {
      fastify.log.error(error, 'Error getting users');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get users',
      });
    }
  });

  /**
   * DELETE /api/users/:id
   * Delete a user
   */
  fastify.delete<{
    Params: { id: string };
  }>(
    '/users/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const prisma = (fastify as any).prisma;

        if (!prisma) {
          return reply.status(503).send({
            error: 'Service Unavailable',
            message: 'Database not initialized',
          });
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
          where: { id },
        });

        if (!user) {
          return reply.status(404).send({
            error: 'Not Found',
            message: `User with ID ${id} not found`,
          });
        }

        // Delete user
        await prisma.user.delete({
          where: { id },
        });

        return reply.status(200).send({
          success: true,
          message: `User ${user.username} deleted successfully`,
        });
      } catch (error) {
        fastify.log.error(error, 'Error deleting user');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to delete user',
        });
      }
    }
  );

  fastify.log.info('API routes registered');
}
