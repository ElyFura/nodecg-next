/**
 * GraphQL Resolvers
 * Implements all queries, mutations, and subscriptions
 */

import { PubSub } from 'graphql-subscriptions';
import type { FastifyInstance } from 'fastify';
import { GraphQLError } from 'graphql';

const pubsub = new PubSub();

// Subscription topics
const TOPICS = {
  REPLICANT_UPDATED: 'REPLICANT_UPDATED',
  REPLICANT_CREATED: 'REPLICANT_CREATED',
  REPLICANT_DELETED: 'REPLICANT_DELETED',
  BUNDLE_UPDATED: 'BUNDLE_UPDATED',
  SYSTEM_EVENT: 'SYSTEM_EVENT',
};

export interface GraphQLContext {
  fastify: FastifyInstance;
  user?: {
    userId: string;
    username: string;
    roleId?: string;
  };
}

export const resolvers = {
  // ============================================
  // Query Resolvers
  // ============================================
  Query: {
    // Bundle Queries
    bundles: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      const bundleManager = (context.fastify as any).bundleManager;
      if (!bundleManager) {
        throw new GraphQLError('Bundle manager not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }

      // Get bundle data from BundleManager's internal map
      const bundlesMap = (bundleManager as any).bundles as Map<string, any>;
      const bundles = Array.from(bundlesMap.values());

      return bundles.map((bundle: any) => ({
        name: bundle.config.name,
        version: bundle.config.version,
        description: bundle.config.description || '',
        authors: bundle.config.authors || [],
        homepage: bundle.config.homepage,
        license: bundle.config.license,
        git: bundle.config.git,
        status: 'LOADED',
        hasExtension: !!bundle.extension,
        hasDashboard: Array.isArray(bundle.config.dashboard) && bundle.config.dashboard.length > 0,
        hasGraphics: Array.isArray(bundle.config.graphics) && bundle.config.graphics.length > 0,
        dashboardPanels: bundle.config.dashboard || [],
        graphics: bundle.config.graphics || [],
        replicants: [],
      }));
    },

    bundle: async (_parent: unknown, { name }: { name: string }, context: GraphQLContext) => {
      const bundleManager = (context.fastify as any).bundleManager;
      if (!bundleManager) {
        throw new GraphQLError('Bundle manager not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }

      // Get bundle from internal map
      const bundlesMap = (bundleManager as any).bundles as Map<string, any>;
      const bundle = bundlesMap.get(name);

      if (!bundle) {
        throw new GraphQLError(`Bundle '${name}' not found`, {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return {
        name: bundle.config.name,
        version: bundle.config.version,
        description: bundle.config.description || '',
        authors: bundle.config.authors || [],
        homepage: bundle.config.homepage,
        license: bundle.config.license,
        git: bundle.config.git,
        status: 'LOADED',
        hasExtension: !!bundle.extension,
        hasDashboard: Array.isArray(bundle.config.dashboard) && bundle.config.dashboard.length > 0,
        hasGraphics: Array.isArray(bundle.config.graphics) && bundle.config.graphics.length > 0,
        dashboardPanels: bundle.config.dashboard || [],
        graphics: bundle.config.graphics || [],
        replicants: [],
      };
    },

    bundleCount: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      const bundleManager = (context.fastify as any).bundleManager;
      if (!bundleManager) return 0;
      const bundlesMap = (bundleManager as any).bundles as Map<string, any>;
      return bundlesMap.size;
    },

    // Replicant Queries
    replicants: async (
      _parent: unknown,
      { namespace }: { namespace?: string },
      context: GraphQLContext
    ) => {
      const replicantService = (context.fastify as any).replicantService;
      if (!replicantService) {
        throw new GraphQLError('Replicant service not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }

      const replicants: any[] = [];
      const replicantMap = (replicantService as any).replicants;

      if (replicantMap instanceof Map) {
        for (const [key, replicant] of replicantMap.entries()) {
          const [ns, name] = key.split(':');
          if (!namespace || ns === namespace) {
            replicants.push({
              namespace: ns,
              name,
              value: replicant.value,
              revision: replicant.revision || 0,
              status: 'ACTIVE',
              schema: replicant.schema || null,
              defaultValue: replicant.defaultValue || null,
              createdAt: replicant.createdAt || new Date(),
              updatedAt: replicant.updatedAt || new Date(),
            });
          }
        }
      }

      return replicants;
    },

    replicant: async (
      _parent: unknown,
      { namespace, name }: { namespace: string; name: string },
      context: GraphQLContext
    ) => {
      const replicantService = (context.fastify as any).replicantService;
      if (!replicantService) {
        throw new GraphQLError('Replicant service not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }

      const replicantMap = (replicantService as any).replicants;
      const key = `${namespace}:${name}`;
      const replicant = replicantMap?.get(key);

      if (!replicant) {
        throw new GraphQLError(`Replicant '${namespace}:${name}' not found`, {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return {
        namespace,
        name,
        value: replicant.value,
        revision: replicant.revision || 0,
        status: 'ACTIVE',
        schema: replicant.schema || null,
        defaultValue: replicant.defaultValue || null,
        createdAt: replicant.createdAt || new Date(),
        updatedAt: replicant.updatedAt || new Date(),
      };
    },

    replicantCount: async (
      _parent: unknown,
      { namespace }: { namespace?: string },
      context: GraphQLContext
    ) => {
      const replicantService = (context.fastify as any).replicantService;
      if (!replicantService) return 0;

      const replicantMap = (replicantService as any).replicants;
      if (!(replicantMap instanceof Map)) return 0;

      if (!namespace) {
        return replicantMap.size;
      }

      let count = 0;
      for (const [key] of replicantMap.entries()) {
        if (key.startsWith(`${namespace}:`)) {
          count++;
        }
      }
      return count;
    },

    replicantNamespaces: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      const replicantService = (context.fastify as any).replicantService;
      if (!replicantService) return [];

      const replicantMap = (replicantService as any).replicants;
      if (!(replicantMap instanceof Map)) return [];

      const namespaces = new Set<string>();
      for (const [key] of replicantMap.entries()) {
        const [namespace] = key.split(':');
        namespaces.add(namespace);
      }

      return Array.from(namespaces);
    },

    // User Queries
    users: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      const prisma = (context.fastify as any).prisma;
      if (!prisma) {
        throw new GraphQLError('Database not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }

      const users = await prisma.user.findMany({
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return users.map((user: any) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
          ? {
              id: user.role.id,
              name: user.role.name,
              description: user.role.description,
              permissions: user.role.rolePermissions.map((rp: any) => ({
                id: rp.permission.id,
                resource: rp.permission.resource,
                action: rp.permission.action,
                description: rp.permission.description,
              })),
            }
          : null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.lastLogin,
      }));
    },

    user: async (_parent: unknown, { id }: { id: string }, context: GraphQLContext) => {
      const prisma = (context.fastify as any).prisma;
      if (!prisma) {
        throw new GraphQLError('Database not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }

      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        throw new GraphQLError(`User with ID '${id}' not found`, {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
          ? {
              id: user.role.id,
              name: user.role.name,
              description: user.role.description,
              permissions: user.role.rolePermissions.map((rp: any) => ({
                id: rp.permission.id,
                resource: rp.permission.resource,
                action: rp.permission.action,
                description: rp.permission.description,
              })),
            }
          : null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.lastLogin,
      };
    },

    me: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const prisma = (context.fastify as any).prisma;
      if (!prisma) {
        throw new GraphQLError('Database not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: context.user.userId },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        throw new GraphQLError('User not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
          ? {
              id: user.role.id,
              name: user.role.name,
              description: user.role.description,
              permissions: user.role.rolePermissions.map((rp: any) => ({
                id: rp.permission.id,
                resource: rp.permission.resource,
                action: rp.permission.action,
                description: rp.permission.description,
              })),
            }
          : null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.lastLogin,
      };
    },

    userCount: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      const prisma = (context.fastify as any).prisma;
      if (!prisma) return 0;

      return await prisma.user.count();
    },

    // System Queries
    systemStats: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      const bundleManager = (context.fastify as any).bundleManager;
      const bundlesMap = bundleManager
        ? ((bundleManager as any).bundles as Map<string, any>)
        : new Map();
      const bundles = Array.from(bundlesMap.values());

      const replicantService = (context.fastify as any).replicantService;
      let replicantCount = 0;
      if (replicantService) {
        const replicants = (replicantService as any).replicants;
        if (replicants instanceof Map) {
          replicantCount = replicants.size;
        }
      }

      const prisma = (context.fastify as any).prisma;
      let userCount = 0;
      if (prisma) {
        userCount = await prisma.user.count();
      }

      const memUsage = process.memoryUsage();

      return {
        bundles: bundles.length,
        replicants: replicantCount,
        users: userCount,
        status: 'ONLINE',
        uptime: process.uptime(),
        memory: {
          rss: memUsage.rss / 1024 / 1024, // MB
          heapTotal: memUsage.heapTotal / 1024 / 1024,
          heapUsed: memUsage.heapUsed / 1024 / 1024,
          external: memUsage.external / 1024 / 1024,
        },
        version: '0.1.0',
      };
    },

    health: () => 'OK',
  },

  // ============================================
  // Mutation Resolvers
  // ============================================
  Mutation: {
    // Bundle Mutations
    reloadBundles: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      const bundleManager = (context.fastify as any).bundleManager;
      if (!bundleManager) {
        throw new GraphQLError('Bundle manager not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }

      await bundleManager.initialize?.();

      // Publish bundle updated event
      await pubsub.publish(TOPICS.BUNDLE_UPDATED, {
        bundleUpdated: {
          type: 'RELOADED',
          bundle: { name: 'all', version: '0.0.0', authors: [], status: 'LOADED' },
        },
      });

      return true;
    },

    reloadBundle: async (_parent: unknown, _args: { name: string }, context: GraphQLContext) => {
      const bundleManager = (context.fastify as any).bundleManager;
      if (!bundleManager) {
        throw new GraphQLError('Bundle manager not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }

      // For now, reload all bundles
      await bundleManager.initialize?.();

      return true;
    },

    // Replicant Mutations
    createReplicant: async (
      _parent: unknown,
      { input }: { input: { namespace: string; name: string; value: any } },
      context: GraphQLContext
    ) => {
      const replicantService = (context.fastify as any).replicantService;
      if (!replicantService) {
        throw new GraphQLError('Replicant service not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }

      const replicantMap = (replicantService as any).replicants;
      const key = `${input.namespace}:${input.name}`;

      const replicant = {
        value: input.value,
        revision: 1,
        schema: null,
        defaultValue: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (replicantMap instanceof Map) {
        replicantMap.set(key, replicant);
      }

      // Publish replicant created event
      await pubsub.publish(TOPICS.REPLICANT_CREATED, {
        replicantCreated: {
          namespace: input.namespace,
          name: input.name,
          value: input.value,
          revision: 1,
        },
      });

      return {
        namespace: input.namespace,
        name: input.name,
        value: input.value,
        revision: 1,
        status: 'ACTIVE',
        schema: null,
        defaultValue: null,
        createdAt: replicant.createdAt,
        updatedAt: replicant.updatedAt,
      };
    },

    updateReplicant: async (
      _parent: unknown,
      { namespace, name, input }: { namespace: string; name: string; input: { value: any } },
      context: GraphQLContext
    ) => {
      const replicantService = (context.fastify as any).replicantService;
      if (!replicantService) {
        throw new GraphQLError('Replicant service not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }

      const replicantMap = (replicantService as any).replicants;
      const key = `${namespace}:${name}`;
      const replicant = replicantMap?.get(key);

      if (!replicant) {
        throw new GraphQLError(`Replicant '${namespace}:${name}' not found`, {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      replicant.value = input.value;
      replicant.revision = (replicant.revision || 0) + 1;
      replicant.updatedAt = new Date();

      // Publish replicant updated event
      await pubsub.publish(TOPICS.REPLICANT_UPDATED, {
        replicantUpdated: {
          namespace,
          name,
          value: input.value,
          revision: replicant.revision,
        },
      });

      return {
        namespace,
        name,
        value: replicant.value,
        revision: replicant.revision,
        status: 'ACTIVE',
        schema: replicant.schema || null,
        defaultValue: replicant.defaultValue || null,
        createdAt: replicant.createdAt || new Date(),
        updatedAt: replicant.updatedAt,
      };
    },

    deleteReplicant: async (
      _parent: unknown,
      { namespace, name }: { namespace: string; name: string },
      context: GraphQLContext
    ) => {
      const replicantService = (context.fastify as any).replicantService;
      if (!replicantService) {
        throw new GraphQLError('Replicant service not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }

      const replicantMap = (replicantService as any).replicants;
      const key = `${namespace}:${name}`;

      if (replicantMap instanceof Map) {
        const deleted = replicantMap.delete(key);

        if (deleted) {
          // Publish replicant deleted event
          await pubsub.publish(TOPICS.REPLICANT_DELETED, {
            replicantDeleted: {
              namespace,
              name,
              value: null,
              revision: 0,
            },
          });
        }

        return deleted;
      }

      return false;
    },

    // User Mutations
    createUser: async (
      _parent: unknown,
      { input }: { input: { username: string; email: string; password: string; roleId?: string } },
      context: GraphQLContext
    ) => {
      const prisma = (context.fastify as any).prisma;
      if (!prisma) {
        throw new GraphQLError('Database not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }

      // TODO: Hash password properly
      const user = await prisma.user.create({
        data: {
          username: input.username,
          email: input.email,
          password: input.password, // TODO: Hash this
          roleId: input.roleId,
        },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
          ? {
              id: user.role.id,
              name: user.role.name,
              description: user.role.description,
              permissions: user.role.rolePermissions.map((rp: any) => ({
                id: rp.permission.id,
                resource: rp.permission.resource,
                action: rp.permission.action,
                description: rp.permission.description,
              })),
            }
          : null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.lastLogin,
      };
    },

    updateUser: async (
      _parent: unknown,
      { id, input }: { id: string; input: { username?: string; email?: string; roleId?: string } },
      context: GraphQLContext
    ) => {
      const prisma = (context.fastify as any).prisma;
      if (!prisma) {
        throw new GraphQLError('Database not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }

      const user = await prisma.user.update({
        where: { id },
        data: {
          username: input.username,
          email: input.email,
          roleId: input.roleId,
        },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
          ? {
              id: user.role.id,
              name: user.role.name,
              description: user.role.description,
              permissions: user.role.rolePermissions.map((rp: any) => ({
                id: rp.permission.id,
                resource: rp.permission.resource,
                action: rp.permission.action,
                description: rp.permission.description,
              })),
            }
          : null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.lastLogin,
      };
    },

    deleteUser: async (_parent: unknown, { id }: { id: string }, context: GraphQLContext) => {
      const prisma = (context.fastify as any).prisma;
      if (!prisma) {
        throw new GraphQLError('Database not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }

      await prisma.user.delete({
        where: { id },
      });

      return true;
    },
  },

  // ============================================
  // Subscription Resolvers
  // ============================================
  Subscription: {
    replicantUpdated: {
      subscribe: (_parent: unknown, _args: { namespace?: string; name?: string }) => {
        // TODO: Filter subscriptions based on namespace and name
        return pubsub.asyncIterableIterator<any>([TOPICS.REPLICANT_UPDATED]);
      },
    },

    replicantCreated: {
      subscribe: () => pubsub.asyncIterableIterator<any>([TOPICS.REPLICANT_CREATED]),
    },

    replicantDeleted: {
      subscribe: () => pubsub.asyncIterableIterator<any>([TOPICS.REPLICANT_DELETED]),
    },

    bundleUpdated: {
      subscribe: () => pubsub.asyncIterableIterator<any>([TOPICS.BUNDLE_UPDATED]),
    },

    systemEvent: {
      subscribe: (_parent: unknown, _args: { types?: string[] }) => {
        // TODO: Filter system events by type if provided
        return pubsub.asyncIterableIterator<any>([TOPICS.SYSTEM_EVENT]);
      },
    },
  },
};

// Export pubsub for use in other modules
export { pubsub, TOPICS };
