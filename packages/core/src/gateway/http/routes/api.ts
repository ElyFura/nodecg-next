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

      // Get replicant count from database
      const prisma = (fastify as any).prisma;
      let replicantCount = 0;
      let userCount = 0;
      if (prisma) {
        replicantCount = await prisma.replicant.count();
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
        author: bundle.config.author || '',
        authors: bundle.config.authors || [],
        homepage: bundle.config.homepage,
        license: bundle.config.license,
        git: bundle.config.git,
        compatibleRange: bundle.config.nodecg?.compatibleRange,
        dependencies: bundle.dependencies || [],
        bundleDependencies: bundle.config.bundleDependencies || bundle.config.dependencies || {},
        status: 'loaded' as const,
        hasExtension: !!bundle.extension,
        hasDashboard:
          Array.isArray(bundle.config.nodecg?.dashboardPanels) &&
          bundle.config.nodecg.dashboardPanels.length > 0,
        hasGraphics:
          Array.isArray(bundle.config.nodecg?.graphics) && bundle.config.nodecg.graphics.length > 0,
        panelCount: Array.isArray(bundle.config.nodecg?.dashboardPanels)
          ? bundle.config.nodecg.dashboardPanels.length
          : 0,
        graphicCount: Array.isArray(bundle.config.nodecg?.graphics)
          ? bundle.config.nodecg.graphics.length
          : 0,
        extensionPath: bundle.extension ? 'extension/index.js' : undefined,
      }));

      return reply.status(200).send({ bundles: bundleList, total: bundleList.length });
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
        updatedAt: rep.updatedAt.toISOString(),
        schema: null,
      }));

      return reply.status(200).send({ replicants, total: replicants.length });
    } catch (error) {
      fastify.log.error(error, 'Error getting replicants');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get replicants',
      });
    }
  });

  /**
   * GET /api/replicants/:namespace/:name
   * Get a single replicant
   */
  fastify.get<{
    Params: { namespace: string; name: string };
  }>(
    '/replicants/:namespace/:name',
    async (
      request: FastifyRequest<{ Params: { namespace: string; name: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { namespace, name } = request.params;
        const prisma = (fastify as any).prisma;

        if (!prisma) {
          return reply.status(503).send({
            error: 'Service Unavailable',
            message: 'Database not initialized',
          });
        }

        const dbReplicant = await prisma.replicant.findFirst({
          where: {
            namespace,
            name,
          },
        });

        if (!dbReplicant) {
          return reply.status(404).send({
            error: 'Not Found',
            message: `Replicant ${namespace}:${name} not found`,
          });
        }

        const replicant = {
          namespace: dbReplicant.namespace,
          name: dbReplicant.name,
          value: JSON.parse(dbReplicant.value),
          revision: dbReplicant.revision,
          updatedAt: dbReplicant.updatedAt.toISOString(),
          schema: null,
        };

        return reply.status(200).send(replicant);
      } catch (error) {
        fastify.log.error(error, 'Error getting replicant');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to get replicant',
        });
      }
    }
  );

  /**
   * PUT /api/replicants/:namespace/:name
   * Update a replicant value
   */
  fastify.put<{
    Params: { namespace: string; name: string };
    Body: { value: unknown };
  }>(
    '/replicants/:namespace/:name',
    async (
      request: FastifyRequest<{
        Params: { namespace: string; name: string };
        Body: { value: unknown };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { namespace, name } = request.params;
        const { value } = request.body;
        const replicantService = (fastify as any).replicantService;

        if (!replicantService) {
          return reply.status(503).send({
            error: 'Service Unavailable',
            message: 'Replicant service not initialized',
          });
        }

        // Update replicant
        await replicantService.set(namespace, name, value);

        return reply.status(200).send({
          success: true,
          message: `Replicant ${namespace}:${name} updated successfully`,
        });
      } catch (error) {
        fastify.log.error(error, 'Error updating replicant');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to update replicant',
        });
      }
    }
  );

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

        // Delete replicant using service
        await replicantService.delete(namespace, name);

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
   * POST /api/users
   * Create a new user
   */
  fastify.post<{
    Body: { username: string; password: string; email?: string; roleId?: string };
  }>(
    '/users',
    async (
      request: FastifyRequest<{
        Body: { username: string; password: string; email?: string; roleId?: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { username, password, email, roleId } = request.body;
        const prisma = (fastify as any).prisma;

        if (!prisma) {
          return reply.status(503).send({
            error: 'Service Unavailable',
            message: 'Database not initialized',
          });
        }

        // Validate required fields
        if (!username || !password) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Username and password are required',
          });
        }

        // Check if username already exists
        const existingUser = await prisma.user.findUnique({
          where: { username },
        });

        if (existingUser) {
          return reply.status(409).send({
            error: 'Conflict',
            message: 'Username already exists',
          });
        }

        // Find role (default to viewer if not specified or not found)
        let role = null;
        if (roleId) {
          role = await prisma.role.findUnique({ where: { id: roleId } });
        }
        if (!role) {
          role = await prisma.role.findUnique({ where: { name: 'viewer' } });
        }

        // Hash password using Node.js crypto (bcrypt not available)
        const crypto = await import('crypto');
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        const passwordHash = `${salt}:${hash}`;

        // Create user
        const user = await prisma.user.create({
          data: {
            username,
            password: passwordHash,
            email: email || null,
            roleId: role?.id || null,
          },
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
        });

        return reply.status(201).send(user);
      } catch (error) {
        fastify.log.error(error, 'Error creating user');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to create user',
        });
      }
    }
  );

  /**
   * PUT /api/users/:id
   * Update a user
   */
  fastify.put<{
    Params: { id: string };
    Body: { username?: string; email?: string; password?: string; roleId?: string };
  }>(
    '/users/:id',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { username?: string; email?: string; password?: string; roleId?: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const { username, email, password, roleId } = request.body;
        const prisma = (fastify as any).prisma;

        if (!prisma) {
          return reply.status(503).send({
            error: 'Service Unavailable',
            message: 'Database not initialized',
          });
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
          where: { id },
        });

        if (!existingUser) {
          return reply.status(404).send({
            error: 'Not Found',
            message: `User with ID ${id} not found`,
          });
        }

        // Build update data
        const updateData: any = {};

        if (username !== undefined) {
          // Check if username is already taken by another user
          const userWithUsername = await prisma.user.findUnique({
            where: { username },
          });
          if (userWithUsername && userWithUsername.id !== id) {
            return reply.status(409).send({
              error: 'Conflict',
              message: 'Username already exists',
            });
          }
          updateData.username = username;
        }

        if (email !== undefined) {
          updateData.email = email || null;
        }

        if (password !== undefined) {
          // Hash new password
          const crypto = await import('crypto');
          const salt = crypto.randomBytes(16).toString('hex');
          const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
          updateData.password = `${salt}:${hash}`;
        }

        if (roleId !== undefined) {
          updateData.roleId = roleId || null;
        }

        // Update user
        const user = await prisma.user.update({
          where: { id },
          data: updateData,
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
        });

        return reply.status(200).send(user);
      } catch (error) {
        fastify.log.error(error, 'Error updating user');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to update user',
        });
      }
    }
  );

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
